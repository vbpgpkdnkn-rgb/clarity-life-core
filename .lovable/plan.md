# Esteira Viva — Editor Contínuo de Conteúdo

Transformar o módulo Esteira de "gerador por etapas" em **um documento vivo** onde o mesmo núcleo narrativo evolui da Ideia ao Roteiro Final, com edição inline em todas as etapas, sugestões contextuais, e revisão diretamente no texto.

---

## 1. Princípios que mudam tudo

1. **Um único núcleo narrativo** persiste em todas as etapas (`narrative_core`): intenção, promessa, tensão, posicionamento, tom. Nenhum agente pode sobrescrever sem motivo — apenas refinar.
2. **Edição em toda etapa**: nunca somente "gerar". Cada bloco tem `[editar] [aceitar] [substituir] [comparar] [refinar trecho]`.
3. **Refinamento parcial > regeneração total**: novos endpoints `refine` aceitam `target` (qual campo/trecho) e `instruction` (mais emocional, mais curto, etc.).
4. **Revisão inline**: a crítica vira anotações ancoradas em trechos do texto, não relatório separado.
5. **Histórico evolutivo**: cada mudança grava `before/after/why/impact` em `content_project_versions`.

---

## 2. Modelo de dados (sem breaking changes)

Reaproveitar tabelas existentes. Adicionar somente campos JSON dentro de `content_projects.context`:

```
context.narrative_core = {
  intent, promise, tension, positioning, tone,
  emotional_goal, audience_pulse
}
context.evolution = [
  { stage, field, before, after, why, impact, at }
]
```

Stages output (em `content_project_stages.output`) ganha estrutura inline-edit-friendly:

```
{ blocks:[{id, role, text, locked, suggestions:[], comments:[]}] }
```

Sem migration nova obrigatória — tudo cabe em jsonb existentes.

---

## 3. Backend — agentes especializados

Refatorar `supabase/functions/content-pipeline-agent/index.ts` para suportar **modos**:

- `mode: "generate"` — geração inicial (atual)
- `mode: "refine"` — recebe `target_block_id` + `instruction`, devolve **somente** o bloco alterado + `why` + `impact`
- `mode: "critique-inline"` — devolve `annotations:[{block_id, range, type, severity, message, suggestion}]`
- `mode: "alternatives"` — devolve 3 variações de um trecho (mais emocional / mais curto / mais agressivo / mais curioso)

Novos agentes:
- `narrative-keeper` — atualiza `narrative_core` quando o usuário edita manualmente
- `inline-critic` — gera anotações no texto (substitui o critic monolítico)
- `block-refiner` — refinamento localizado

**Regra inegociável** já no SHARED_SYSTEM: "Nunca regenere o que não foi pedido. Devolva apenas o `target` solicitado."

---

## 4. Frontend — componentes novos

```
src/components/conteudo/pipeline/
  LivingDocumentShell.tsx     // wrapper persistente: header com narrative_core + timeline lateral
  NarrativeCorePanel.tsx       // mostra/edita intent, promise, tension, tom
  StageEditor.tsx              // editor inline por etapa (substitui telas isoladas)
  EditableBlock.tsx            // bloco com text editável + ações (refinar/alternativas/comparar)
  InlineSuggestions.tsx        // sugestões pop-over ao lado do bloco
  InlineAnnotations.tsx        // marcadores ⚠ ancorados em trechos com tooltip
  VersionDiffDrawer.tsx        // antes/depois + why/impact
  AlternativesPicker.tsx       // 3 variações lado a lado
  ScriptFinalToolbar.tsx       // copiar / teleprompter / exportar / versão limpa
  TeleprompterMode.tsx         // overlay full-screen scroll automático
```

Refatorar `ContentPipelineTab.tsx` para usar `LivingDocumentShell` com:
- header fixo: título + `NarrativeCorePanel` colapsável
- timeline horizontal de etapas (já existe)
- corpo central: `StageEditor` da etapa atual (sem trocar de "ferramenta")
- sidebar direita: histórico evolutivo + comentários

---

## 5. Hooks

```
useRefineBlock()          // chama mode:refine, atualiza só o bloco
useInlineCritique()       // chama mode:critique-inline
useAlternatives()         // chama mode:alternatives
useNarrativeCore()        // CRUD do narrative_core com auto-merge
useEvolutionLog()         // lê context.evolution
```

`useRunStageAgent` continua para geração inicial; novos hooks são para edição.

---

## 6. UX da revisão (etapa 7)

A "Revisão" deixa de ser tela separada. Vira **camada** sobre o roteiro (etapa 6):
- toggle "Modo revisão" no `StageEditor` do roteiro
- IA gera `annotations` ancoradas
- ⚠ aparece à margem; clicar abre popover com diagnóstico + botão "aplicar sugestão" (patch cirúrgico no bloco)
- usuário aceita/rejeita uma a uma; cada aceite vira entrada em `evolution`

---

## 7. Roteiro Final (etapa 8)

`ScriptFinalToolbar` com ações:
- **Copiar** (texto puro)
- **Modo teleprompter** (overlay, fonte grande, scroll por velocidade)
- **Exportar** .txt / .md
- **Versão limpa** (só falas)
- **Versão com marcações** (inclui notas de gravação)
- **Versão resumida** (bullets dos blocos)
- **Versão por blocos** (separado por role)

Tudo client-side puro (`src/lib/scriptExport.ts`).

---

## 8. Entrega faseada

**Fase A (esta entrega)** — fundação do editor vivo:
1. `narrative_core` + `evolution` no context (sem migration)
2. Agente: modos `refine`, `critique-inline`, `alternatives`
3. Componentes: `LivingDocumentShell`, `NarrativeCorePanel`, `EditableBlock`, `InlineSuggestions`, `AlternativesPicker`
4. Refator `ContentPipelineTab` para shell único
5. Hooks `useRefineBlock`, `useAlternatives`, `useNarrativeCore`

**Fase B** — revisão inline + roteiro final premium:
6. `InlineAnnotations` + modo revisão sobre o roteiro
7. `ScriptFinalToolbar` + `TeleprompterMode` + `scriptExport.ts`
8. `VersionDiffDrawer` consumindo `content_project_versions`

**Fase C** — polish:
9. Histórico evolutivo na sidebar com why/impact
10. Comparação de versões lado a lado
11. Auto-save + indicador de status

---

## 9. O que NÃO muda

- Tabelas e RLS já existentes
- Outras abas (Ideias, Audience, Stories, Editorial, Growth) — apenas ganham botão "Enviar para Esteira"
- Edge functions antigas (`relational-content-engine`, `audience-intelligence`) seguem funcionando para fluxos antigos
- `useContentProject`, `useSaveStageOutput` — só ganham companhia, não somem

---

## 10. Resultado esperado

O usuário abre um projeto e vê **um único documento** que ele lapida. Cada etapa é uma camada do mesmo objeto. A IA aparece como sugestões ao lado, nunca como "outro app". Revisão acontece em cima do texto. O roteiro final sai pronto para gravar com um clique para teleprompter.

Posso começar pela **Fase A** agora?
