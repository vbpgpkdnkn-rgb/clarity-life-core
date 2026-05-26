# Framework de Energia — integração aditiva no módulo Conteúdo

Vou adicionar o conceito **TOPO / MEIO / FUNDO** em todas as superfícies do módulo, sem remover nada do que já existe. Tudo aditivo.

## 1. Base compartilhada

**Novo arquivo `src/lib/energia.ts`**
- Tipo `Energia = 'topo' | 'meio' | 'fundo'`
- Metadados (label, descrição, classes Tailwind para badge, instruções de prompt para a IA, checklist de publicação)
- Distribuição alvo: `{ topo: 3, meio: 1, fundo: 1 }`

**Novo hook `src/hooks/useDistribuicaoSemana.ts`**
- Lê `content_pieces` da semana atual (segunda→domingo) usando `planned_date` ou `published_at`
- Retorna `{ topo, meio, fundo, proxima, semanaCompleta, weekStart }`
- Usado em 4 lugares: Motor, Editorial, Pipeline, página principal

## 2. Banco de dados

Migração adicionando coluna opcional `energia text` em `public.content_pieces` (com check constraint `topo|meio|fundo` ou null). Sem default, totalmente backward-compatible.

Também adicionar `energia` no payload aceito por `useUpsertPiece` (o hook já é genérico — basta passar pelo type).

## 3. Motor Relacional (`RelationalEngineTab.tsx`)

Antes do botão "Gerar tópicos":
- Banner de sugestão lendo `useDistribuicaoSemana` ("faltam 2 topos esta semana")
- 3 cards clicáveis (Topo/Meio/Fundo) com card selecionado em borda accent
- Linha de contexto abaixo descrevendo o tom da energia escolhida
- Suporte a seed inicial via `seed.energia` (para pré-seleção vinda da home)

No `promptParaAPI` injetar `instrucaoEnergia[energia]` no topo.

Em `sendToProduction`, passar `energia` no upsert da peça.

## 4. Editorial (`Conteudo.tsx > EditorialTab`)

No topo da aba:
- Painel visual com 3 linhas (TOPO/MEIO/FUNDO) mostrando bolinhas preenchidas/vazias e contagem
- Indicação da próxima energia necessária

Substituir prompt do botão "Gerar plano semanal com IA" para usar o template do framework (com distribuição alvo e regras de não-repetição de Fundo). Renderizar cards do plano com badge de energia.

## 5. Pipeline (`Conteudo.tsx > PipelineTab`)

- Resumo clicável no topo: "Esta semana: TOPO 1/3 · MEIO 0/1 · FUNDO 1/1" → ao clicar troca para aba Editorial
- Badge de energia em cada card (cores: topo=âmbar, meio=azul, fundo=verde — via classes semânticas)
- No botão "Avançar etapa", quando a próxima etapa for `publicado`: abrir `Dialog` com checklist específico da energia. Botão "Confirmar publicação" só fica ativo com tudo marcado. Se card sem energia: checklist genérico + aviso.

## 6. Inteligência de Audiência (`AudienceIntelligenceTab`)

- Adicionar `energia` ao prompt das ideias geradas pela edge function correspondente (atualizar prompt no backend `audience-intelligence`)
- Renderizar badge de energia em cada ideia
- Marcar "✦ Prioritária" quando a energia da ideia é a que está faltando na semana

## 7. Página principal (`Conteudo.tsx`)

Substituir o 4º card de métricas (ou adicionar logo abaixo dos 4) por um **card de status estratégico**:
- Mostra distribuição da semana (TOPO/MEIO/FUNDO com bolinhas)
- Próxima energia necessária + botão "Criar agora" → seta `seed` com `energia` pré-selecionada e abre aba Motor
- Botão "Ver editorial" → troca para aba editorial
- Estado completo: "✓ Semana estratégica completa"

## Detalhes técnicos

- Energia é **persistida** em `content_pieces.energia` (migração).
- Badges usam classes via mapa de variantes — sem hardcode de cor crua nos componentes.
- O `RelationalSeed` type ganha campo opcional `energia?: Energia`.
- Nada é removido: campos antigos (`pillar`, `objective`, `clinical_anchor`) continuam funcionando lado a lado.
- Edge function `audience-intelligence` precisa de pequeno ajuste no prompt + schema da tool para incluir `energia`.

## Arquivos tocados

Novos:
- `src/lib/energia.ts`
- `src/hooks/useDistribuicaoSemana.ts`
- `supabase/migrations/<timestamp>_add_energia_to_content_pieces.sql`

Editados:
- `src/pages/Conteudo.tsx` (card de status, EditorialTab, PipelineTab)
- `src/components/conteudo/RelationalEngineTab.tsx` (seletor + injeção no prompt + persistência)
- `src/components/conteudo/AudienceIntelligenceTab.tsx` (badge + prioritária)
- `supabase/functions/audience-intelligence/index.ts` (campo energia na saída)

Posso prosseguir?