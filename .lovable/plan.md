# Consolidação da Esteira de Conteúdo

Objetivo: transformar a esteira em uma única linha narrativa contínua. Não mexer na arquitetura modular já estabilizada (StageRouter, fila, providers, error boundaries). Apenas consolidar lógica de continuidade, herança e edição.

## 1. Bússola = Memória do Projeto (unificação)

Hoje `NarrativeCorePanel` (bússola) e `ProjectMemorySidebar` (memória) vivem separados. Vou:

- Criar um único modelo `ProjectCompass` salvo em `content_projects.context.compass` com todos os campos: `central_idea, intent, promise, emotional_tension, strategic_goal, audience, pains, desires, format, duration, density, tone, rhythm, cta, examples, references, narrative_style, writing_pattern, refinement_history`.
- `NarrativeCorePanel` torna-se a UI canônica da bússola, exibida no topo da esteira, sempre visível e editável inline.
- `ProjectMemorySidebar` deixa de ser uma entidade paralela e passa a ler do mesmo `compass` (apenas como visualização auxiliar / histórico de refinamentos).
- Toda chamada à edge function `content-pipeline-agent` passa o `compass` completo no payload de contexto — não apenas `project.context` cru.

## 2. Memória Autoral

Criar campo `compass.author_signature` populado automaticamente a cada edição manual de bloco no `EditableBlock`:

- Captura: tamanho médio de frase, uso de perguntas, conectores frequentes, padrões de hook, padrões de fechamento, densidade emocional.
- Acumulado em `compass.author_signature.samples` (últimas 30 edições).
- Enviado em todo refinamento como instrução de estilo: "imite ritmo X, hooks Y, fechamentos Z".

## 3. Estratégia como DNA (prompt mestre)

A etapa 3 (Estratégia) passa a gerar e salvar um `compass.master_prompt` — um bloco de texto consolidado que serve de prefixo para TODAS as gerações subsequentes (estrutura, tópicos, roteiro, crítico, refinamento, alternativas).

- Edge function `content-pipeline-agent` lê `master_prompt` e injeta como system message obrigatório.
- Se ausente, a esteira avisa "Defina a estratégia antes de avançar".

## 4. Continuidade 1:1 entre etapas

**Estrutura → Tópicos**: o agente `topic-writer` recebe `blocks` da estrutura e DEVE retornar `topics` com mesma quantidade, mesma ordem, mesmos `id`s e mesma `role`. Ele só pode adicionar campos (`strong_phrase`, `recording_note`, `target_seconds`, `micro_hook`). Validação no servidor: se a contagem ou ordem mudar, rejeita e força regenerar preservando IDs.

**Tópicos → Roteiro**: idem. `script-writer` recebe topics e retorna `paragraphs` 1:1, herdando `id` (prefixado `p:` mas com mapeamento `from_topic_id`), `role`, `target_seconds`. Só expande `text`.

Ajustes na edge function: prompts explícitos "NÃO renomeie blocos, NÃO altere ordem, NÃO adicione/remova; apenas expanda".

## 5. Botões Salvar / Copiar / Salvar e avançar

Em cada `EditableBlock` (estrutura, tópicos, roteiro), adicionar barra de ações no modo edição:

- `[Salvar]` — persiste via `useApplyBlockEdit`
- `[Copiar]` — copia texto pro clipboard
- `[Salvar e avançar]` — salva e move foco pro próximo bloco / próxima etapa quando é o último

## 6. Previsão de tempo e ritmo (roteiro)

Já existe `ScriptHeader` com `totalSeconds` e `retentionRisk`. Vou expandir:

- Por bloco: badge mostrando segundos estimados vs. alvo.
- Cabeçalho: breakdown HOOK / DESENVOLVIMENTO / CONCLUSÃO em segundos.
- Alertas: introdução >20% do total, bloco lento (>180 wpm equivalente), excesso de duração total.

## 7. Revisão inline aplicável

Hoje `useInlineCritique` retorna anotações mas o usuário não tem como aplicar. Vou:

- Cada anotação ganha `suggested_text` no schema (já existe parcialmente como `suggestion`).
- Em `EditableBlock`, quando há annotation, exibir card com: problema · motivo · impacto · sugestão e três botões: `[Aplicar]` `[Editar manualmente]` `[Comparar]`.
- `[Aplicar]` chama `useApplyBlockEdit` substituindo apenas o trecho destacado (ou o bloco inteiro se a anotação for de bloco), registra em `evolution`.
- Ajustar prompt do `critique-inline` para sempre retornar `{ block_id, problem, reason, impact, suggested_text }` estruturado.

## 8. Finalização da esteira

Depois da etapa 7 (Revisão), adicionar bloco de finalização:

- Botão `[Enviar para pipeline]`
- Ação:
  1. Marca `content_projects.status = 'concluido'`
  2. Cria `content_pieces` ligado via `linked_piece_id` com `status='roteiro_pronto'`, hook/script/CTA preenchidos a partir da etapa 6
  3. Atualiza `compass.refinement_history` com snapshot final
  4. Mostra confirmação "Conteúdo enviado para o pipeline"

## Arquivos afetados

**Edge function**
- `supabase/functions/content-pipeline-agent/index.ts` — injetar `master_prompt`, validar 1:1 (estrutura→tópicos, tópicos→roteiro), reformatar critique-inline com `suggested_text`.

**Hooks**
- `src/hooks/usePipelineEditor.ts` — `useApplyAnnotation`, `useFinalizeProject`, captura de `author_signature` em `useApplyBlockEdit`.
- `src/hooks/useContentProject.ts` — helpers do compass.

**Componentes pipeline**
- `NarrativeCorePanel.tsx` — vira UI completa da bússola (todos os campos).
- `ProjectMemorySidebar.tsx` — lê do compass, vira só visualização.
- `EditableBlock.tsx` — barra Salvar/Copiar/Salvar e avançar; card de anotação aplicável.
- `stages/StructureStage.tsx`, `TopicsStage.tsx`, `ScriptStage.tsx` — passar `compass` ao agente; preservar IDs no merge.
- `stages/ScriptStage.tsx` — breakdown de tempo por seção.
- `stages/ReviewStage.tsx` — anotações com `[Aplicar]`.
- Novo `stages/FinalizeStage.tsx` (ou bloco em ReviewStage) — "Enviar para pipeline".

**Sem mudança de schema de DB** — tudo vive em `content_projects.context.compass` (jsonb existente).

## Não-objetivos

- Não mexer em StageRouter, PipelineProviders, fila, ErrorBoundary, RecoveryLayer.
- Não adicionar páginas/módulos novos.
- Não criar tabelas (compass cabe no jsonb existente).
- Não tocar em UI fora da esteira.

## Ordem de implementação

1. Edge function: master_prompt + validação 1:1 + critique-inline estruturado
2. Bússola unificada (NarrativeCorePanel + ProjectMemorySidebar leitura)
3. EditableBlock: ações + anotações aplicáveis
4. Stages: passar compass + preservar IDs
5. Author signature
6. ScriptStage: breakdown de tempo
7. FinalizeStage: enviar para pipeline
