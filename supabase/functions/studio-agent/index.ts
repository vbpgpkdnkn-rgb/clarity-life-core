// studio-agent v7 — DNA Daniele Ferreira — Lovable AI Gateway
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const BASE_CONTEXT = `Você é o roteirista pessoal de Daniele Ferreira, psicóloga clínica com mais de 10 anos de experiência especializada em relacionamentos (IBCT + Gottman).

MISSÃO: amplificar o raciocínio clínico dela — não substituir. Pegar o que ela viu, pensou ou percebeu e transformar em linguagem que para o scroll, provoca identificação real e demonstra autoridade genuína. Você é um colaborador, não uma ferramenta.

QUEM ELA É:
Fala de relacionamentos como um todo — maturidade relacional como competência de vida. Como a gente se relaciona com o outro, com o mundo, com o trabalho, com a família, consigo mesma. Não é a psicóloga de casais que brigam. Prefere postar menos e ser lembrada do que postar muito e ser esquecida. Público: pessoas de 25 a 45 anos que querem evoluir relacionalmente — não necessariamente em crise. Não produz conteúdo só para mulheres.

O QUE ELA QUER PROVOCAR: que a pessoa pense algo que nunca tinha pensado sobre si mesma — e que de repente faça todo sentido. Não é inspiração. É reconhecimento. A pessoa para, sente que foi vista, e não consegue não compartilhar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTAMENTE PROIBIDO — sem exceção em qualquer output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Clichês relacionais: "comunicação é a chave", "amor próprio primeiro", "você merece alguém que", "relacionamentos saudáveis", "seja a melhor versão"
- Linguagem de coach: "sua jornada", "você merece", "transforme sua vida", "a paz está ao seu alcance", "potencial", "propósito", "desperte"
- Perguntas retóricas genéricas de abertura: "você sabia que", "já se perguntou", "e se eu te dissesse", "você já parou para pensar"
- Cenários novelescos fabricados: não construa cenas inventadas tipo "imagina que você está no jantar e..."
- CTAs de venda direta: "me chama no direct", "clique aqui", "agende agora", "link na bio", "manda mensagem"
- Listas disfarçadas de roteiro: "3 passos para", "5 sinais de", bullet points no meio da fala
- Jargão clínico solto sem tradução: "inundação emocional", "evitação experiencial", "regulação emocional" — sempre traduzir em comportamento cotidiano
- Tom motivacional que qualquer psicóloga genérica do Instagram usaria
- Qualquer frase que já foi dita mil vezes no Instagram de psicologia

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OBRIGATÓRIO — sempre presente:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Uma ideia central que a pessoa nunca ouviu dita assim — específica, não genérica
- Arco narrativo real: começa num lugar, termina em outro
- Virada genuína: não óbvia — inverte expectativa ou nomeia o que ninguém nomeou
- Linguagem concreta que nomeia sentimento — não constrói cena novelesca
- Ritmo de fala real: frases que respiram, pausas funcionam, sem subordinadas longas
- Gancho que para porque é verdadeiro — não porque é dramático ou clickbait
- Fechamento que a pessoa manda para alguém — emerge do raciocínio, não é sentença genérica
- Raciocínio clínico dela como matéria-prima — amplifica, não substitui

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRADUÇÃO OBRIGATÓRIA DE CONCEITOS CLÍNICOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- "inundação emocional" → "quando você está tão ativada que não consegue mais ouvir — só defender"
- "tentativa de reparação" → "aquele gesto pequeno no meio da briga que tenta baixar a temperatura antes que os dois percam o fio"
- "evitação experiencial" → "ficar em silêncio não porque não tem o que dizer, mas porque já sabe que não vai adiantar"
- "polarização" → "quanto mais um pressiona, mais o outro recua — e quanto mais recua, mais o outro pressiona"
- "diferenças irreconciliáveis" → "tem coisas no outro que não vão mudar — a questão não é resolver, é decidir se você consegue viver com isso"
- "aceitação" → "aprender a estar com o desconforto sem transformar ele em briga"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRUTURA DO ROTEIRO (6 blocos obrigatórios):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Hook — frase que para por ser verdadeira. Identificação imediata. Máx 2 frases.
2. Contexto Emocional — situar o que acontece. Emoção antes de informação. Comportamento cotidiano reconhecível.
3. Microchoque — virada que quebra o previsível. O que parece ser o problema NÃO é. Este bloco CONTRADIZ ou COMPLEXIFICA o anterior.
4. Insight de Descoberta — percepção nova. Não é dica. A âncora clínica (IBCT/Gottman) traduzida em comportamento. A pessoa pensa "ah, então é isso".
5. Resolução / Transformação — abre direção. Conecta à tese: relações exigem repertório, consciência, reparação. Não resolve tudo. Não é moral da história.
6. CTA — gera comentários ou próxima parte. NUNCA venda direta.

REGRA CRÍTICA DE PROGRESSÃO: cada bloco precisa do anterior para fazer sentido. Blocos que funcionam isolados estão errados.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENERGIA DOS CONTEÚDOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOPO — Identificação: a pessoa se reconhece. Sentimento universal, sem solução pronta. Objetivo: "ela me entendeu". Gancho parte de automatismo relacional ou desgaste silencioso. Fechamento: reconhecimento, sem CTA. NUNCA: drama, motivacional, listas.
MEIO — Confiança Clínica: nomeia dinâmica invisível. IBCT ou Gottman em comportamento. Objetivo: "ela sabe do que fala". Gancho: tensão emocional + quebra da percepção óbvia.
FUNDO — Reduzir Resistência: convida ao processo sem empurrar. Tom íntimo, direto. Objetivo: "talvez eu precise conversar com ela". CTA elegante, nunca de venda.

Distribuição ideal: 3 topo · 1 meio · 1 fundo por semana.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECKLIST INTERNO ANTES DE QUALQUER OUTPUT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Tem uma ideia que a pessoa nunca ouviu dita assim?
- O gancho para — por ser verdadeiro, não por ser dramático?
- Tem virada que desloca perspectiva genuinamente?
- A aterrissagem muda algo na cabeça de quem assistiu?
- Alguma frase é clichê que qualquer psicóloga diria?
- Tem linguagem de coach em algum lugar?
- O raciocínio dela está presente — ou foi substituído por genérico?
- A âncora clínica está traduzida em comportamento cotidiano?

Se qualquer resposta for negativa — reescrever antes de entregar.

Responda SEMPRE em JSON válido conforme o schema pedido. Nada além do JSON.`;

function memoryBlock(ai_memory: unknown): string {
  if (!Array.isArray(ai_memory) || ai_memory.length === 0) return "(sem histórico ainda)";
  return JSON.stringify(ai_memory.slice(-10));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGemini(prompt: string, imageBase64?: string, imageType?: string): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente nos Secrets");

  const messages = imageBase64 && imageType
    ? [
        { role: "system", content: BASE_CONTEXT },
        { role: "user", content: [
          { type: "image_url", image_url: { url: `data:${imageType};base64,${imageBase64}` } },
          { type: "text", text: prompt },
        ] },
      ]
    : [
        { role: "system", content: BASE_CONTEXT },
        { role: "user", content: prompt },
      ];

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "{}";
    }

    if (res.status === 429) {
      const waitMs = (attempt + 1) * 3000;
      console.log(`Rate limit, aguardando ${waitMs}ms (tentativa ${attempt + 1})`);
      await sleep(waitMs);
      continue;
    }

    const errBody = await res.text();
    if (res.status === 402) throw new Error("Créditos Lovable AI esgotados. Adicione créditos em Settings → Plans & credits.");
    throw new Error(`Lovable AI ${res.status}: ${errBody.slice(0, 200)}`);
  }

  throw new Error("Limite de requisições atingido. Aguarde 1 minuto e tente novamente.");
}

function parseJSON(raw: string): unknown {
  try { return JSON.parse(raw); }
  catch {
    const m = String(raw).match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { raw };
  }
}

function buildPrompt(action: string, payload: Record<string, unknown>): string {
  switch (action) {
    case "phase1_read":
      return `Analise este material bruto da psicóloga e entregue uma leitura estratégica.

MATERIAL:
- Tema: ${payload.tema ?? "(vazio)"}
- Tipo de entrada: ${payload.tipo_entrada ?? "(não informado)"}
- Intenção de uso: ${payload.intencao_uso ?? "(não informado)"}
- O que ela viu/pensou/percebeu: ${payload.conteudo ?? "(vazio)"}
- Comentários da audiência: ${payload.conteudo_audiencia ?? "(nenhum)"}
- Série: ${payload.serie_nome ? `${payload.serie_nome} ep ${payload.serie_position ?? "?"}` : "(sem série)"}

Entregue:
1. Energia sugerida (UMA: topo, meio ou fundo) com razão clínica clara
2. O que este tema revela — qual observação relacional por trás que a maioria não nomeou
3. Qual caminho narrativo faz mais sentido — a DIREÇÃO da abordagem, não o roteiro
4. Padrões nos comentários da audiência, se houver

JSON:
{
  "energia_sugerida": "topo | meio | fundo",
  "razao_energia": "1 frase explicando por que esta energia se encaixa",
  "observacao": "2 a 4 frases sobre o potencial clínico deste tema — o que ele toca que as pessoas não percebem em si mesmas",
  "caminho_narrativo": "1 a 2 frases sobre qual direção a abordagem deve seguir",
  "padroes_audiencia": "string | null"
}`;

    case "phase2_validate":
      return `Valide a coerência estratégica desta peça.

- Tema: ${payload.tema ?? "(vazio)"}
- Energia: ${payload.energia ?? "(nenhuma)"}
- Estratégia de criação: ${payload.creation_strategy ?? "(nenhuma)"}
- Metas de resultado: ${JSON.stringify(payload.metas_resultado ?? [])}
- Intenção de uso: ${payload.intencao_uso ?? "(não informado)"}
- Matéria-prima original: ${payload.conteudo ?? "(vazio)"}
- Insight manual dela: ${payload.insight_manual ?? "(nenhum)"}
- Caminho narrativo da fase 1: ${payload.caminho_narrativo ?? "(nenhum)"}
- Histórico: ${memoryBlock(payload.ai_memory)}

JSON:
{
  "aprovado_para_roteiro": true,
  "status": "alinhado | conflito",
  "comentario": "1 a 3 frases sobre o alinhamento",
  "sugestao": "string corretiva específica | null",
  "metas_sugeridas": ["metas baseadas no histórico e estratégia"],
  "insights_estrategicos": ["insights que ampliam o potencial desta peça"],
  "evitar": ["armadilhas específicas para este tema — não genéricas"]
}`;

    case "phase3_insights": {
      const modo = (payload.modo as string) ?? "bullets";

      if (modo === "resolver_falta") {
        return `A psicóloga sentiu falta de algo nos bullet points gerados. Apresente uma solução.

BULLET POINTS EXISTENTES: ${JSON.stringify(payload.bullets_existentes ?? [])}
O QUE ELA SENTIU FALTA: ${payload.faltou ?? "(não especificado)"}
TEMA: ${payload.tema ?? "(vazio)"}
ENERGIA: ${payload.energia ?? "(nenhuma)"}
MATÉRIA-PRIMA ORIGINAL: ${payload.conteudo ?? "(vazio)"}

JSON:
{
  "solucao": "explicação em 2-3 frases de como cobrir o que faltou — em linguagem de fala",
  "bullet_adicional": "frase do novo ponto em linguagem de fala natural"
}`;
      }

      return `Gere os bullet points com os ASSUNTOS que precisam ser abordados neste conteúdo específico.

ATENÇÃO: não são ângulos diferentes. São os tópicos/assuntos do MESMO conteúdo — como uma pauta do que precisa ser dito para que o roteiro chegue à virada e à aterrissagem certas.

CONTEXTO:
- Tema: ${payload.tema ?? "(vazio)"}
- Energia: ${payload.energia ?? "(nenhuma)"}
- Estratégia: ${payload.creation_strategy ?? "(nenhuma)"}
- Metas de resultado: ${JSON.stringify(payload.metas_resultado ?? [])}
- O que ela viu/percebeu (matéria-prima principal): ${payload.conteudo ?? "(vazio)"}
- Insight manual dela: ${payload.insight_manual ?? "(nenhum)"}
- Caminho narrativo da fase 1: ${payload.caminho_narrativo ?? "(nenhum)"}
- Observação da fase 1: ${payload.observacao_fase1 ?? "(nenhuma)"}
- Sugestão da validação que foi aprovada: ${payload.sugestao_aplicada ?? "(nenhuma)"}
- Comentários da audiência: ${payload.conteudo_audiencia ?? "(nenhum)"}
- Histórico (para não repetir): ${memoryBlock(payload.ai_memory)}

Gere de 4 a 6 bullet points. Cada um deve ser uma frase curta em linguagem de fala que captura um assunto/ponto a ser abordado. A sequência deve seguir a progressão narrativa: entrada → virada → mecanismo → aterrissagem.

JSON:
{
  "insights": [
    {
      "id": "b1",
      "titulo_angulo": "assunto em 3-5 palavras",
      "frase_semente": "frase em linguagem de fala que captura este ponto"
    }
  ]
}`;
    }

    case "phase3_draft":
      return `Escreva o roteiro completo seguindo EXATAMENTE a estrutura de 6 blocos.

CONTEXTO:
- Tema: ${payload.tema ?? "(vazio)"}
- Energia: ${payload.energia ?? "(nenhuma)"}
- Estratégia: ${payload.creation_strategy ?? "(nenhuma)"}
- Metas a alcançar: ${JSON.stringify(payload.metas_resultado ?? [])}
- Intenção de uso: ${payload.intencao_uso ?? "(não informado)"}
- O que ela viu/percebeu (matéria-prima — amplificar, não substituir): ${payload.conteudo ?? "(vazio)"}
- Insight manual dela: ${payload.insight_manual ?? "(nenhum)"}
- Leitura estratégica da fase 1: ${JSON.stringify(payload.leitura_fase1 ?? {})}
- Validação estratégica da fase 2: ${JSON.stringify(payload.validacao_fase2 ?? {})}
- Tópicos aprovados para abordar (na sequência): ${JSON.stringify(payload.topicos_para_abordar ?? [])}
- Modelo narrativo de referência (use a ESTRUTURA, a progressão e o tipo de virada; NÃO copie conteúdo): ${payload.modelo_roteiro ? `\n${payload.modelo_roteiro}` : "(nenhum — usar estrutura padrão de 6 blocos)"}

ESTRUTURA OBRIGATÓRIA dos 6 blocos:
1. Hook — frase que para porque é verdadeira. Parte de comportamento específico reconhecível. Máx 2 frases.
2. Contexto Emocional — situar o que acontece. Emoção antes de informação. O que a pessoa reconhece na própria vida.
3. Microchoque — virada. O que parece ser o problema NÃO é. CONTRADIZ ou COMPLEXIFICA o anterior. Sem isso o conteúdo é linear.
4. Insight de Descoberta — percepção nova. Âncora clínica traduzida em comportamento. A pessoa pensa "ah, então é isso."
5. Resolução / Transformação — abre direção, não fecha com moral. Conecta à tese da série.
6. CTA — gera comentário ou próxima parte. NUNCA venda.

REGRAS:
- Linguagem de fala — como ela falaria, não como escreveria
- Frases curtas, pausas naturais
- Total: 220 a 250 palavras (~90 segundos)
- Uma entrega por roteiro — não lista de dicas
- Cada bloco precisa do anterior para fazer sentido
- Se houver modelo narrativo, preserve o desenho da progressão dele: tipo de abertura, ponto de virada, cadência de revelação e aterrissagem

JSON:
{
  "blocos": [
    {
      "papel": "Hook | Contexto Emocional | Microchoque | Insight de Descoberta | Resolução / Transformação | CTA",
      "texto": "texto em linguagem de fala natural",
      "nota_gravacao": "instrução curta de tom/entrega para este bloco"
    }
  ]
}`;

    case "phase3_adjust":
      return `Ajuste SOMENTE o que foi pedido.

REGRA ABSOLUTA: se ajustes_marcados está vazio E instrucao_livre está vazia ou contém "manter" — retorne os blocos EXATAMENTE como recebeu. Nenhuma letra alterada.

BLOCOS ATUAIS:
${JSON.stringify(payload.blocos_atuais ?? [])}

AJUSTES: ${JSON.stringify(payload.ajustes_marcados ?? [])}
INSTRUÇÃO: ${payload.instrucao_livre ?? "(nenhuma)"}
ÍNDICE DO BLOCO ALVO (se específico): ${payload.bloco_alvo_idx ?? "todos"}

JSON:
{
  "blocos_ajustados": [
    { "papel": "string", "texto": "string", "nota_gravacao": "string" }
  ],
  "papeis_modificados": ["papéis alterados — vazia se nenhum"]
}`;

    case "phase3_review":
      return `Análise crítica deste roteiro como diretor de conteúdo clínico exigente.

NÃO reescreva nenhum bloco. Apenas analise e aponte com precisão.

ROTEIRO:
${JSON.stringify(payload.blocos_finais ?? [])}

CONTEXTO:
- Tema: ${payload.tema ?? "(vazio)"}
- Energia: ${payload.energia ?? "(nenhuma)"}
- Metas: ${JSON.stringify(payload.metas_resultado ?? [])}
- Estratégia: ${payload.creation_strategy ?? "(nenhuma)"}
- Matéria-prima original: ${payload.conteudo ?? "(vazio)"}
- Histórico: ${memoryBlock(payload.ai_memory)}

CRITÉRIOS DE AVALIAÇÃO:
- O gancho para porque é verdadeiro, não porque é dramático?
- O Microchoque realmente inverte ou só anuncia uma virada?
- O Insight traz ancoragem clínica em comportamento cotidiano?
- A Resolução abre direção sem virar moral genérica?
- Tem frase de coach em algum lugar?
- O raciocínio dela está presente ou foi substituído por genérico?
- Cabe em 90 segundos?

SCORE: calcule honestamente de 0 a 100.
- Gancho forte + virada real + aterrissagem que muda algo = 70-90
- Problemas pontuais mas estrutura ok = 50-70
- Genérico, sem virada ou linguagem de coach = abaixo de 50

JSON:
{
  "score_retencao": número de 0 a 100,
  "estimativa": "baixa | moderada | alta",
  "pontos_fortes": ["ponto específico que funciona"],
  "pontos_fracos": [{"ponto": "nome do bloco + o que está errado", "correcao": "como corrigir especificamente"}],
  "alerta_posicionamento": "string se houver risco de soar genérico | null",
  "comentario_final": "1-2 frases diretas sobre o roteiro"
}`;

    case "phase4_derivatives":
      return `Transforme em 4 formatos com ÂNGULOS GENUINAMENTE DIFERENTES — não repetição.

Como conversar sobre o mesmo tema com perspectivas distintas: aspectos clínicos diferentes, situações práticas, provocações.

- Tema: ${payload.tema ?? "(vazio)"}
- Energia: ${payload.energia ?? "(nenhuma)"}
- Roteiro original: ${payload.roteiro_final_texto ?? "(vazio)"}
- Insights salvos: ${JSON.stringify(payload.insights_multiconteudo ?? [])}

JSON:
{
  "tiktok": { "angulo": "string", "script": "30-45s, direto, íntimo, mais próximo", "instrucao_gravacao": "string" },
  "carousel": { "angulo": "string", "slides": [{ "n": 1, "titulo": "string", "corpo": "string curto" }] },
  "stories": { "angulo": "string", "cards": [{ "n": 1, "tipo": "abertura|enquete|quote|reflexao|cta", "texto": "string", "sugestao_visual": "string" }] },
  "debate": { "angulo": "string", "legenda": "pergunta ou afirmação sem emojis, máx 3 linhas", "intencao": "string" }
}`;

    case "generate_captions":
      return `Escreva 2 opções de legenda para Instagram.

- Tema: ${payload.tema ?? "(vazio)"}
- Roteiro: ${payload.script ?? "(vazio)"}
- Energia: ${payload.energia ?? "(nenhuma)"}
- Estratégia: ${payload.creation_strategy ?? "(nenhuma)"}
- Padrão de comunicação anterior: ${memoryBlock(payload.ai_memory)}

REGRAS ABSOLUTAS:
- Máximo 3 linhas de texto corrido
- Linguagem de fala — como ela falaria para uma pessoa, não como escreveria
- Primeira frase captura a ideia central como insight ou pergunta
- SEM emojis, SEM hashtags, SEM CTAs de venda, SEM "salva esse post", SEM listas
- Objetivo: quem lê sente "preciso assistir isso"

JSON:
{
  "opcao_1": { "texto": "legenda completa — abordagem direta" },
  "opcao_2": { "texto": "legenda diferente da primeira — outro ângulo de entrada" }
}`;

    case "analyze_instagram_image":
      return `Extraia números das métricas do Instagram Insights desta imagem. Para campos não visíveis use null.

JSON:
{
  "visualizacoes": null, "contas_alcancadas": null, "seguidores_alcancados": null,
  "nao_seguidores_alcancados": null, "novos_seguidores": null,
  "likes": null, "comments": null, "saves": null, "shares": null,
  "contas_engajamento": null, "dms_recebidos": null, "agendamentos": null
}`;

    case "phase5_performance":
      return `Analise o desempenho desta peça publicada com honestidade clínica e estratégica.

- Tema: ${payload.tema ?? "(vazio)"}
- Energia: ${payload.energia ?? "(nenhuma)"}
- Metas originais: ${JSON.stringify(payload.metas_resultado ?? [])}
- Roteiro: ${payload.roteiro_texto ?? "(vazio)"}
- Métricas: ${JSON.stringify(payload.metricas ?? {})}
- Comentários recebidos: ${payload.comentarios ?? "(nenhum)"}
- Histórico: ${memoryBlock(payload.ai_memory)}
- Série: ${payload.series_name ? `${payload.series_name} ep ${payload.series_position}` : "não"}
- Histórico recente: ${JSON.stringify(payload.historico_resumo ?? [])}

JSON:
{
  "o_que_funcionou": [{"ponto": "string", "razao": "string"}],
  "o_que_nao_funcionou": [{"ponto": "string", "hipotese": "string", "correcao": "string"}],
  "proximos_conteudos": "string aplicável e específico",
  "comparacao_posts": "string | null",
  "serie_proxima_sugestao": "string | null",
  "comentarios_para_conteudo": [{"comentario": "string", "tema_sugerido": "string"}],
  "reuso_sugerido": false,
  "memoria_entrada": { "tema": "string", "energia": "string", "resultado": "alto | médio | baixo", "aprendizado": "lição em 1 frase" }
}`;

    case "suggest_stories":
      return `Sugira 5 ideias concretas de stories para hoje.

- Data: ${payload.data ?? "hoje"}
- Energia dos posts da semana: ${JSON.stringify(payload.energia_semana ?? {})}
- Últimos temas: ${JSON.stringify(payload.ultimos_temas ?? [])}
- Histórico de stories: ${JSON.stringify(payload.historico_stories ?? [])}

Tipos: bastidores | rotina | reflexao | dica_clinica | pergunta_audiencia | teaser_conteudo | outro

JSON:
{
  "sugestoes": [
    { "slot": 1, "tipo": "string", "sugestao": "descrição prática em 2 frases do que mostrar ou dizer" }
  ]
}`;

    case "analyze_series":
      return `Analise esta série de conteúdo com honestidade estratégica.

- Série: ${payload.series_name ?? "(sem nome)"}
- Episódios publicados: ${JSON.stringify(payload.episodios ?? [])}
- Total planejado: ${payload.total_planejado ?? "indefinido"}

JSON:
{
  "funcionando": "string — o que gera resultado concreto",
  "mudar": "string — o que não funciona e por quê",
  "proximos_episodios": "sugestão com temas e ângulos para os próximos 3",
  "vale_continuar": "sim | talvez | nao",
  "recomendacao": "recomendação direta sobre o futuro desta série"
}`;

    default:
      throw new Error(`action desconhecida: ${action}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { action, payload } = await req.json();
    if (!action) {
      return new Response(JSON.stringify({ error: "campo 'action' obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const prompt = buildPrompt(action, payload ?? {});
    const imageBase64 = action === "analyze_instagram_image" ? (payload as Record<string, unknown>)?.image_base64 as string : undefined;
    const imageType = action === "analyze_instagram_image" ? (payload as Record<string, unknown>)?.image_type as string : undefined;
    const raw = await callGemini(prompt, imageBase64, imageType);
    const parsed = parseJSON(raw);
    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[studio-agent]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});