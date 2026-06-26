// studio-agent v6 — Lovable AI Gateway (Gemini 2.5 Flash)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const BASE_CONTEXT = `Você é o copiloto de uma psicóloga clínica (10+ anos, IBCT e Gottman, público mulheres 25-45) na criação de conteúdo sobre maturidade relacional.

PROIBIDO: clichês, linguagem de coach, inspiração vazia, listas disfarçadas, CTAs de venda, generalizações, novelão fabricado.
OBRIGATÓRIO: linguagem de fala (não escrita), virada genuína, observação clínica concreta, posicionamento de referência.

Energia do conteúdo:
- topo: identificação ("isso sou eu")
- meio: confiança clínica ("ela sabe do que fala")
- fundo: reduzir resistência ("talvez eu precise de ajuda")

Responda SEMPRE em JSON válido conforme o schema pedido. Nada além do JSON.`;

function memoryBlock(ai_memory: unknown): string {
  if (!Array.isArray(ai_memory) || ai_memory.length === 0) return "(sem histórico)";
  return JSON.stringify(ai_memory.slice(-10));
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function callGemini(prompt: string, imageBase64?: string, imageType?: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY ausente nos Secrets do Supabase");

  const messages = imageBase64 && imageType
    ? [
        { role: "system", content: BASE_CONTEXT },
        { role: "user", content: [
          { type: "image_url", image_url: { url: `data:${imageType};base64,${imageBase64}` } },
          { type: "text", text: prompt },
        ]},
      ]
    : [
        { role: "system", content: BASE_CONTEXT },
        { role: "user", content: prompt },
      ];

  // Retry até 3x com backoff para rate limit
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "{}";
    }

    if (res.status === 429) {
      // Rate limit — aguardar e tentar de novo
      const waitMs = (attempt + 1) * 3000;
      console.log(`Rate limit, aguardando ${waitMs}ms (tentativa ${attempt + 1})`);
      await sleep(waitMs);
      continue;
    }

    const errBody = await res.text();
    if (res.status === 402) throw new Error("Créditos Gemini esgotados. Verifique em aistudio.google.com");
    throw new Error(`Gemini ${res.status}: ${errBody.slice(0, 200)}`);
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
      return `Analise esta entrada bruta de tema e devolva uma leitura.

ENTRADA:
- tema: ${payload.tema ?? "(vazio)"}
- tipo_entrada: ${payload.tipo_entrada ?? "(não informado)"}
- intencao_uso: ${payload.intencao_uso ?? "(não informado)"}
- conteúdo bruto: ${payload.conteudo ?? "(vazio)"}
- comentários da audiência: ${payload.conteudo_audiencia ?? "(nenhum)"}
- série: ${payload.serie_nome ?? "(nenhuma)"} ${payload.serie_position ? "ep " + payload.serie_position : ""}

JSON:
{
  "energia_sugerida": "topo | meio | fundo",
  "observacao": "1 a 3 frases curtas e diretas sobre o potencial clínico deste tema",
  "padroes_audiencia": "string resumindo padrões detectados nos comentários | null"
}`;

    case "phase2_validate":
      return `Valide se a estratégia desta peça está coerente e gere insights estratégicos.

- tema: ${payload.tema ?? "(vazio)"}
- energia escolhida: ${payload.energia ?? "(nenhuma)"}
- estratégia de criação: ${payload.creation_strategy ?? "(nenhuma)"}
- objetivo: ${payload.objetivo ?? "(vazio)"}
- metas de resultado: ${JSON.stringify(payload.metas_resultado ?? payload.meta_resultado ?? [])}
- memória de peças anteriores: ${memoryBlock(payload.ai_memory)}

JSON:
{
  "aprovado_para_roteiro": true,
  "status": "alinhado | conflito",
  "comentario": "1 a 3 frases",
  "sugestao": "string | null",
  "metas_sugeridas": ["string"],
  "insights_estrategicos": ["string"],
  "evitar": ["string"]
}`;

    case "phase3_insights":
      return `Gere 4 insights distintos para roteiro de Reel.

- tema: ${payload.tema ?? "(vazio)"}
- energia: ${payload.energia ?? "(nenhuma)"}
- estratégia: ${payload.creation_strategy ?? "(nenhuma)"}
- objetivo: ${payload.objetivo ?? "(vazio)"}
- comentários da audiência: ${payload.conteudo_audiencia ?? "(nenhum)"}
- memória: ${memoryBlock(payload.ai_memory)}
- template: ${payload.script_template ? JSON.stringify(payload.script_template) : "(nenhum)"}

JSON:
{
  "insights": [
    {
      "id": "string único",
      "titulo_angulo": "3 a 5 palavras",
      "tensao": "tensão clínica em 1 frase",
      "frase_semente": "abertura em linguagem de fala",
      "energia_sugerida": "topo | meio | fundo"
    }
  ]
}`;

    case "phase3_draft":
      return `Escreva o esboço do roteiro em 5 blocos: Hook / Contexto Emocional / Microchoque / Insight de Descoberta / Resolução / Transformação.

- tema: ${payload.tema ?? "(vazio)"}
- energia: ${payload.energia ?? "(nenhuma)"}
- objetivo: ${payload.objetivo ?? "(vazio)"}
- insights aprovados: ${JSON.stringify(payload.insights_aprovados ?? [])}
- template: ${payload.script_template ? JSON.stringify(payload.script_template) : "(padrão)"}

Linguagem de fala. Total 45-65 segundos (~110-165 palavras). NÃO inclua CTA.

JSON:
{
  "blocos": [
    { "papel": "Hook | Contexto Emocional | Microchoque | Insight de Descoberta | Resolução / Transformação",
      "texto": "string em linguagem de fala",
      "nota_gravacao": "instrução curta de entrega" }
  ]
}`;

    case "phase3_adjust":
      return `Ajuste APENAS os blocos necessários.
REGRA CRÍTICA: se ajustes_marcados está vazio E instrucao_livre está vazia ou diz "manter", retorne os blocos EXATAMENTE como estão, sem NENHUMA alteração.

BLOCOS ATUAIS: ${JSON.stringify(payload.blocos_atuais ?? [])}
AJUSTES MARCADOS: ${JSON.stringify(payload.ajustes_marcados ?? [])}
INSTRUÇÃO LIVRE: ${payload.instrucao_livre ?? "(nenhuma)"}

JSON:
{
  "blocos_ajustados": [{ "papel": "string", "texto": "string", "nota_gravacao": "string" }],
  "papeis_modificados": ["lista dos papéis alterados — vazia se nenhum"]
}`;

    case "phase3_review":
      return `Análise crítica do roteiro. NÃO reescreva blocos. Apenas comente e aponte.

- tema: ${payload.tema ?? "(vazio)"}
- energia: ${payload.energia ?? "(nenhuma)"}
- estratégia: ${payload.creation_strategy ?? "(nenhuma)"}
- objetivo: ${payload.objetivo ?? "(vazio)"}
- blocos: ${JSON.stringify(payload.blocos_finais ?? [])}
- memória: ${memoryBlock(payload.ai_memory)}

JSON:
{
  "score_retencao": 0,
  "estimativa": "baixa | moderada | alta",
  "pontos_fortes": ["string"],
  "pontos_fracos": [{"ponto": "string", "correcao": "sugestão aplicável"}],
  "alerta_posicionamento": "string | null",
  "comentario_final": "string"
}`;

    case "phase4_derivatives":
      return `Transforme em 4 formatos com ÂNGULOS GENUINAMENTE DIFERENTES — não repetição da mesma mensagem. Cada formato explora um aspecto diferente do tema.

- tema: ${payload.tema ?? "(vazio)"}
- energia: ${payload.energia ?? "(nenhuma)"}
- roteiro: ${payload.roteiro_final_texto ?? "(vazio)"}
- insights para multiconteúdo: ${JSON.stringify(payload.insights_multiconteudo ?? [])}

JSON:
{
  "tiktok": { "angulo": "string", "script": "string (30-45s, direto, íntimo)", "instrucao_gravacao": "string" },
  "carousel": { "angulo": "string", "slides": [{ "n": 1, "titulo": "string", "corpo": "string" }] },
  "stories": { "angulo": "string", "cards": [{ "n": 1, "tipo": "abertura|enquete|quote|reflexao|cta", "texto": "string", "sugestao_visual": "string" }] },
  "debate": { "angulo": "string", "legenda": "string", "intencao": "string" }
}`;

    case "generate_captions":
      return `Você é a psicóloga clínica autora deste conteúdo. Escreva 2 opções de legenda para Instagram.

- tema: ${payload.tema ?? "(vazio)"}
- roteiro: ${payload.script ?? "(vazio)"}
- energia: ${payload.energia ?? "(nenhuma)"}
- estratégia: ${payload.creation_strategy ?? "(nenhuma)"}
- memória de comunicação: ${memoryBlock(payload.ai_memory)}

REGRAS:
- Máximo 3 linhas de texto corrido
- Linguagem de fala direta — como ela falaria para uma pessoa
- Primeira frase captura a ideia central como insight ou pergunta
- Sem emojis, hashtags, CTAs de venda, "salva esse post", listas, aspas
- Objetivo: quem lê sente "preciso assistir isso"

JSON:
{
  "opcao_1": { "texto": "legenda completa" },
  "opcao_2": { "texto": "legenda com abordagem diferente da primeira" }
}`;

    case "analyze_instagram_image":
      return `Extraia os números das métricas do Instagram Insights desta imagem. Para campos não visíveis use null.

JSON:
{
  "visualizacoes": null, "contas_alcancadas": null, "seguidores_alcancados": null,
  "nao_seguidores_alcancados": null, "novos_seguidores": null,
  "likes": null, "comments": null, "saves": null, "shares": null,
  "contas_engajamento": null, "dms_recebidos": null, "agendamentos": null
}`;

    case "phase5_performance":
      return `Analise o desempenho desta peça publicada com honestidade clínica.

- tema: ${payload.tema ?? "(vazio)"}
- energia: ${payload.energia ?? "(nenhuma)"}
- objetivo: ${payload.objetivo ?? "(vazio)"}
- roteiro: ${payload.roteiro_texto ?? "(vazio)"}
- métricas: ${JSON.stringify(payload.metricas ?? {})}
- comentários recebidos: ${payload.comentarios ?? "(nenhum)"}
- memória de peças anteriores: ${memoryBlock(payload.ai_memory)}
- série: ${payload.series_name ? `${payload.series_name} ep ${payload.series_position}` : "não"}
- histórico recente: ${JSON.stringify(payload.historico_resumo ?? [])}

JSON:
{
  "o_que_funcionou": [{"ponto": "string", "razao": "string"}],
  "o_que_nao_funcionou": [{"ponto": "string", "hipotese": "string", "correcao": "string"}],
  "proximos_conteudos": "string aplicável",
  "comparacao_posts": "string | null",
  "serie_proxima_sugestao": "string | null",
  "comentarios_para_conteudo": [{"comentario": "string", "tema_sugerido": "string"}],
  "reuso_sugerido": false,
  "memoria_entrada": { "tema": "string", "energia": "string", "resultado": "alto | médio | baixo", "aprendizado": "string" }
}`;

    case "suggest_stories":
      return `Sugira 5 ideias de stories para hoje baseadas no contexto da semana.

- data: ${payload.data ?? "hoje"}
- energia dos posts da semana: ${JSON.stringify(payload.energia_semana ?? {})}
- últimos temas: ${JSON.stringify(payload.ultimos_temas ?? [])}
- histórico de stories: ${JSON.stringify(payload.historico_stories ?? [])}

Tipos: bastidores | rotina | reflexao | dica_clinica | pergunta_audiencia | teaser_conteudo | outro

JSON:
{
  "sugestoes": [
    { "slot": 1, "tipo": "string", "sugestao": "descrição prática em 2 frases" }
  ]
}`;

    case "analyze_series":
      return `Analise esta série de conteúdo com honestidade estratégica.

- série: ${payload.series_name ?? "(sem nome)"}
- episódios publicados: ${JSON.stringify(payload.episodios ?? [])}
- total planejado: ${payload.total_planejado ?? "indefinido"}

JSON:
{
  "funcionando": "string — o que gera resultado concreto",
  "mudar": "string — o que não funciona e por quê",
  "proximos_episodios": "string — sugestão para os próximos 3 com temas e ângulos",
  "vale_continuar": "sim | talvez | nao",
  "recomendacao": "string — recomendação direta sobre o futuro desta série"
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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
