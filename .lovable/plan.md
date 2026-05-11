# Reestruturação do Módulo Conteúdo — Esteira Contínua com Memória Viva

## 1. Diagnóstico (o que está quebrado hoje)

O módulo atual é um **conjunto de ferramentas isoladas** (Audience Intelligence, Chat de Refinamento, Motor Relacional, Stories, Editorial), não uma esteira. Cada uma:

- Recebe inputs próprios e gera outputs próprios.
- Não lê o que a anterior produziu (ou lê de forma fragmentada via `notes`/`source`).
- Faz a IA "reiniciar" o raciocínio a cada chamada de edge function.
- Não versiona decisões, refinamentos ou mudanças de direção.

O resultado: o usuário constrói uma ideia rica no chat, clica "enviar para Motor Relacional", e a IA recomeça do zero usando só o título. A intenção emocional, o ângulo, os exemplos, as objeções mapeadas — tudo evapora.

Outros problemas confirmados:

- **Audience Intelligence** está ancorada apenas em comentários — falta camada de análise de conteúdo, retenção, narrativa, tensão.
- **Tópicos de gravação** ainda têm texto demais e não estão estruturados em blocos funcionais (Intro/Desenvolvimento/Conclusão/CTA).
- **Roteiro final** é fraco: sai como parágrafos justapostos sem progressão emocional, sem timing, sem tensão.
- **Não existe revisão crítica** — a IA escreve mas não edita o que escreveu.
- **Não existe controle de tempo** (segundos por bloco, densidade, alertas de retenção).
- **Não existe versionamento** — refinar = sobrescrever.

---

## 2. Nova Arquitetura — "Content Project" como entidade central

Hoje a unidade é a `content_idea` ou o `content_piece`. A nova unidade é o **Content Project**: um contêiner que carrega memória do início ao fim.

```text
┌─────────────────────────────────────────────────────────┐
│                  CONTENT PROJECT                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  CONTEXT MEMORY (sempre injetada na IA)           │  │
│  │   • intenção original                             │  │
│  │   • ângulo estratégico                            │  │
│  │   • tom / voz / posicionamento                    │  │
│  │   • dores + desejos + objeções da audiência       │  │
│  │   • hooks/metáforas/exemplos aprovados            │  │
│  │   • decisões do usuário (o que rejeitou/aprovou)  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  STAGES (pipeline) ──────────────────────────────────►   │
│  1.Ideia → 2.Audiência → 3.Refinamento → 4.Estrutura    │
│  → 5.Tópicos → 6.Roteiro → 7.Crítica → 8.Gravação       │
│  → 9.Edição → 10.Postagem → 11.Calendário → 12.Pipeline │
│                                                          │
│  VERSIONS (snapshot por estágio, com diff)              │
└─────────────────────────────────────────────────────────┘
```

**Princípio único e inegociável:** toda edge function de IA recebe o **Context Memory completo do projeto + output da estágio anterior** — nunca apenas os campos do form atual.

---

## 3. Esteira (12 estágios) e o que cada um herda

| # | Estágio | Herda de | Produz |
|---|---|---|---|
| 1 | Ideia central | — | seed: tema + intenção + formato alvo |
| 2 | Inteligência de audiência (híbrida) | 1 | dores, desejos, objeções, padrões emocionais, gaps narrativos |
| 3 | Refinamento estratégico (chat) | 1+2 | ângulo definido, tom, posicionamento, hook bruto |
| 4 | Estrutura | 1+2+3 | arco narrativo (entrada→virada→mecanismo→aterrissagem) |
| 5 | Tópicos de gravação | 1→4 | 4 blocos funcionais (Intro/Desenv/Conclusão/CTA) |
| 6 | Roteiro final | 1→5 | roteiro com timing, tensão, transições |
| 7 | Revisão crítica | 6 | diagnóstico + sugestões aplicáveis |
| 8 | Preparação gravação | 6 (versão final) | teleprompter + notas de produção |
| 9 | Edição | 8 | checklist + cortes sugeridos |
| 10 | Postagem | 9 | copy, CTA, hashtags, horário |
| 11 | Calendário | 10 | slot na linha editorial |
| 12 | Pipeline | 11 | métricas + insights de retroalimentação para estágio 2 |

Cada estágio mostra na UI um **card de "herança"** colapsável: *"O que você está construindo aqui veio de: [resumo dos estágios anteriores]"*. Editável, mas com aviso quando edição diverge da intenção original.

---

## 4. Memória Contextual — como persiste tecnicamente

Nova tabela:

```sql
content_projects (
  id, title, intent, scope,
  current_stage int,
  context jsonb,          -- a "memória viva"
  created_at, updated_at
)

content_project_stages (
  id, project_id,
  stage int,              -- 1..12
  status text,            -- pending|active|done|skipped
  input jsonb,            -- snapshot do contexto na entrada
  output jsonb,           -- resultado do estágio
  ai_reasoning text,      -- por que a IA decidiu assim
  user_decisions jsonb,   -- o que o usuário aprovou/rejeitou/editou
  created_at
)

content_project_versions (
  id, project_id, stage,
  payload jsonb,
  diff_from_previous jsonb,
  label text,             -- "v3 - hook reforçado"
  created_at
)
```

O campo `context` em `content_projects` é o **estado canônico** — o que sempre vai pra IA. Atualizado incrementalmente a cada estágio (merge, não sobrescrita):

```ts
context = {
  intent: "...",
  angle: "...",
  tone: "...",
  positioning: "...",
  audience: { pains:[], desires:[], objections:[], emotional_patterns:[] },
  approved_assets: { hooks:[], metaphors:[], examples:[], phrases:[] },
  rejected: { hooks:[], directions:[] },     // negativas também são contexto
  narrative: { arc:"", tension_points:[], cta_type:"" },
  timing: { target_seconds: 60, density:"medio" }
}
```

---

## 5. Camada de IA — agentes especializados

Em vez de uma edge function "faz-tudo", criar **agentes com responsabilidade única**, todos lendo o mesmo `context`:

| Agente | Função | Edge atual relacionada |
|---|---|---|
| `audience-analyst` | análise híbrida (comentários + conteúdo + posicionamento) | audience-intelligence |
| `strategist` | define ângulo, tom, intenção, arco | idea-refinement-chat |
| `structurer` | converte arco em 4 blocos funcionais | (novo) |
| `topic-writer` | tópicos de gravação enxutos | relational-content-engine |
| `script-writer` | roteiro com timing | (novo, ou refactor) |
| `critic` | revisão crítica + sugestões | (novo) |
| `retention-engine` | calcula densidade, alerta riscos | (novo) |

Acima de todos, um **orchestrator** (lib `src/lib/contentPipeline.ts`):
- Lê `context` do projeto.
- Chama o agente do estágio atual.
- Faz merge do output no `context`.
- Salva versão.
- Avança o stage.

Reasoning compartilhado via prompt template injetado em todos:
```
SISTEMA: Você é parte de uma esteira. NUNCA reinicie raciocínio.
CONTEXTO DO PROJETO: {context completo}
ESTÁGIO ANTERIOR: {output stage n-1}
SEU PAPEL: {responsabilidade do agente}
RESTRIÇÕES: respeitar approved_assets, evitar rejected, manter tone.
```

---

## 6. Audience Intelligence híbrida

Hoje só lê comentários. Nova versão cruza 4 fontes:

1. **Audiência** (comentários, DMs, perguntas) — já existe
2. **Conteúdo do criador** (peças anteriores em `content_pieces` + métricas em `content_metrics`) — identifica padrões de retenção, ângulos saturados, gaps
3. **Posicionamento** (lido de `content_strategy`) — niche, ICP, oferta, tom
4. **Análise emocional/narrativa** — tensões mapeadas, arcos que funcionam

Output enriquecido:
```jsonc
{
  pains:[...], desires:[...], objections:[...],
  saturated_angles:[...],            // já bateu nessa tecla muitas vezes
  underexplored_angles:[...],        // gap que rende
  emotional_patterns:[...],
  retention_signals:{ what_held:[...], what_dropped:[...] },
  viral_potential:{ score, reasons:[] },
  narrative_tension_opportunities:[...]
}
```

---

## 7. Tópicos de gravação — formato funcional

Substituir o output verboso atual por **4 blocos máx**:

```text
┌──────────────────────────────────────────┐
│ INTRODUÇÃO            ⏱ 8s               │
│ Objetivo emocional: curiosidade + tensão │
│ Ideia central: ...                        │
│ Micro-hook: "..."                         │
│ Frase forte: "..."                        │
│ Nota gravação: olhar fixo, sem sorrir    │
└──────────────────────────────────────────┘
       ↓ transição: "mas o que ninguém vê é..."
┌──────────────────────────────────────────┐
│ DESENVOLVIMENTO       ⏱ 35s              │
│ ...                                       │
└──────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ CONCLUSÃO             ⏱ 12s              │
└──────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ CTA                   ⏱ 5s               │
└──────────────────────────────────────────┘
```

Schema do bloco: `{ role, seconds, emotional_goal, strategic_intent, main_idea, micro_hooks[], strong_phrases[], tension, transition_to_next, recording_note }`.

---

## 8. Roteiro final — cinematográfico

Gerado a partir dos 4 blocos + `context`. Estrutura:

- **Hook** (≤10s): pergunta/afirmação/cena
- **Escalada** (15–25s): aumenta tensão
- **Mecanismo** (20–30s): explica o "porquê"
- **Quebra de expectativa** (5–10s)
- **Aterrissagem + CTA** (10–15s)

UI: cada parte como **parágrafo editável** com chip de timing e botão "regerar só esta parte" (passa contexto + parágrafos vizinhos — não reescreve tudo).

---

## 9. Engine de Tempo & Retenção

Função pura no front (`src/lib/timing.ts`):
```ts
estimateSeconds(text, wpm = 160) // pt-BR cadência média
densityScore(blocks) // info por segundo
retentionRisk(blocks) // hook fraco? introdução lenta? excesso?
```

Alertas inline no roteiro:
- 🟡 "Hook acima de 10s — pode perder 30% nos primeiros segundos"
- 🟡 "Densidade alta no bloco 2 — considere cortar 1 ideia"
- 🔴 "CTA com mais de 3 ações — escolha uma"

---

## 10. Revisão Crítica (estágio 7)

Agente `critic` analisa o roteiro v1 e devolve:

```jsonc
{
  diagnostics: [
    { type:"weak_hook", severity:"high", location:"paragraph_1", reason:"...", suggestion:"..." },
    { type:"repetition", ... },
    { type:"low_emotion", ... },
    { type:"weak_cta", ... }
  ],
  alternatives: {
    hooks: [3 versões],
    ctas: [3 versões],
    transitions: [...]
  },
  overall_score: 72,
  retention_estimate: "moderada"
}
```

UI: lista de diagnósticos com botão **"Aplicar"** que faz patch cirúrgico no roteiro (não regera tudo) e cria nova versão.

---

## 11. UX — sensação de continuidade

Topo do módulo Conteúdo passa a ser uma **timeline horizontal de estágios** do projeto ativo:

```text
●━━━●━━━●━━━●━━━○━━━○━━━○━━━○━━━○━━━○━━━○━━━○
1   2   3   4   5   6   7   8   9   10  11  12
✓   ✓   ✓   ✓   ●   ·   ·   ·   ·   ·   ·   ·
                aqui
```

- Clicar em estágio anterior abre em **modo leitura** com botão "voltar e refinar" (cria branch).
- Sidebar direita persistente: **Project Memory** (intenção, tom, ângulo, ativos aprovados) — sempre visível, editável.
- Botão "ver evolução" mostra diff visual entre versões.

---

## 12. Implementação no Lovable — fases

**Fase 1 — Fundação (sem quebrar nada existente)**
- Migration: criar `content_projects`, `content_project_stages`, `content_project_versions`.
- `src/hooks/useContentProject.ts` (CRUD + carregamento de contexto).
- `src/lib/contentPipeline.ts` (orchestrator no front).
- Componente `<ProjectMemorySidebar />`.
- Componente `<StageTimeline />`.

**Fase 2 — Esteira mínima viável (estágios 1, 3, 5, 6, 7)**
- Reaproveita `idea-refinement-chat` → grava no `context`.
- Refactor `relational-content-engine` para receber `context` completo e respeitar `approved_assets`/`rejected`.
- Nova edge `script-writer` (roteiro com timing).
- Nova edge `script-critic` (revisão crítica).
- `src/lib/timing.ts` (puro, sem IA).

**Fase 3 — Audience híbrida + estrutura + estágios operacionais**
- Refactor `audience-intelligence` para 4 fontes.
- Nova edge `content-structurer`.
- Estágios 8–12 amarrados ao que já existe (`content_pieces`, `tasks`, `editorial_lines`).

**Fase 4 — Versionamento + diffs + branches**
- UI de histórico, comparação, restaurar versão.

**Fase 5 — Retroalimentação**
- Estágio 12 lê `content_metrics` e injeta de volta no `context` para os próximos projetos do mesmo pilar.

---

## 13. Detalhes técnicos chave

- **Contexto sempre via referência por id**: edge functions recebem `project_id`, buscam `context` no banco com service role — evita payloads gigantes e mantém fonte única da verdade.
- **Patch incremental**: regenerar parte ≠ regenerar tudo. Toda função de IA aceita `scope: "full" | "section"` + `target_id`.
- **Decisões negativas viram contexto**: quando o usuário rejeita um hook, ele entra em `context.rejected.hooks[]` e a IA recebe instrução explícita de não repetir o padrão.
- **Idempotência por stage**: rerun do mesmo estágio cria nova versão, nunca sobrescreve.
- **Streaming opcional** no roteiro (Lovable AI suporta) para dar sensação de "construção ao vivo".

---

## 14. O que eu não vou tocar

- `RelationalEngineTab` continua funcionando (vira a UI do estágio 5/6 no novo modelo).
- `IdeaRefinementChatDrawer` vira a UI do estágio 3.
- `AudienceIntelligenceTab` vira a UI do estágio 2 (com camadas extras).
- `StoriesTab`, `EditorialLine`, `Pipeline`, `Decision`, `Growth`, `References`, `Ideas` — preservados, mas agora podem **se conectar** a um Content Project ativo.

---

## 15. Próximo passo concreto

Se você aprovar este plano, eu começo pela **Fase 1 + Fase 2** numa única entrega:

1. Migration das 3 tabelas novas + RLS.
2. Hook `useContentProject` + orchestrator.
3. `<ProjectMemorySidebar />` + `<StageTimeline />` no topo de `/conteudo`.
4. Refactor do `relational-content-engine` para ler `context` do projeto.
5. Nova edge `script-writer` com timing.
6. Nova edge `script-critic` com diagnósticos aplicáveis.
7. `src/lib/timing.ts`.

É uma entrega grande (provavelmente 8–12 arquivos novos + 4–5 editados) mas auto-contida — nada do fluxo atual quebra durante a transição.

**Confirme a aprovação ou aponte ajustes** (priorizar fase diferente, simplificar memória, mudar nº de estágios, etc.) e eu executo.
