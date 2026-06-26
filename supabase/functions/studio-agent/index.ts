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

type Action =
  | "phase1_read"
  | "phase2_validate"
  | "phase3_insights"
  | "phase3_draft"
  | "phase3_adjust"
  | "phase3_review"
  | "phase4_derivatives"
  | "phase5_performance";

const BLOCK_ROLES = ["Hook", "Contexto Emocional", "Microchoque", "Insight de Descoberta", "Resolução"];

function memoryBlock(ai_memory: unknown): string {
  if (!Array.isArray(ai_memory) || ai_memory.length === 0) return "(sem histórico)";
  return JSON.stringify(ai_memory.slice(-10));
}

function promptFor(action: Action, payload: Record<string, unknown>): string {
  switch (action) {
    case "phase1_read":
      return `Analise esta entrada bruta de tema e devolva uma leitura.

ENTRADA:
- tema: ${payload.tema ?? "(vazio)"}
- tipo_entrada: ${payload.tipo_entrada ?? "(não informado)"}
- origem: ${payload.origem ?? "(não informado)"}
- conteúdo bruto: ${payload.conteudo ?? "(vazio)"}
- comentários da audiência: ${payload.conteudo_audiencia ?? "(nenhum)"}
- série: ${payload.serie_nome ?? "(nenhuma)"} ${payload.serie_position ? "ep " + payload.serie_position : ""}

JSON:
{
  "energia_sugerida": "topo" | "meio" | "fundo",
  "observacao": "1 a 3 frases curtas",
  "padroes_audiencia": "string | null"
}`;

    case "phase2_validate":
      return `Valide se a estratégia desta peça está coerente.

- tema: ${payload.tema ?? "(vazio)"}
- energia escolhida: ${payload.energia ?? "(nenhuma)"}
- estratégia de criação: ${payload.creation_strategy ?? "(nenhuma)"}
- objetivo: ${payload.objetivo ?? "(vazio)"}
- meta de resultado: ${payload.meta_resultado ?? "(nenhuma)"}

Avalie alinhamento. Ex: energia "topo" com meta "agendar sessão" tem conflito.

JSON:
{
  "aprovado_para_roteiro": boolean,
  "status": "alinhado" | "conflito",
  "comentario": "1 a 3 frases",
  "sugestao": "string | null"
}`;

    case "phase3_insights":
      return `Gere 4 insights distintos para roteiro de Reel a partir do material abaixo.

- tema: ${payload.tema ?? "(vazio)"}
- energia: ${payload.energia ?? "(nenhuma)"}
- estratégia: ${payload.creation_strategy ?? "(nenhuma)"}
- objetivo: ${payload.objetivo ?? "(vazio)"}
- comentários da audiência: ${payload.conteudo_audiencia ?? "(nenhum)"}
- memória de peças anteriores: ${memoryBlock(payload.ai_memory)}
- template de roteiro escolhido: ${payload.script_template ? JSON.stringify(payload.script_template) : "(nenhum)"}

Cada insight deve ser um ÂNGULO DIFERENTE para o mesmo tema, não variações da mesma frase. Evite repetir ângulos já usados na memória.

JSON:
{
  "insights": [
    {
      "id": "string curto único (ex: 'ang1')",
      "titulo_angulo": "string curta",
      "tensao": "frase única que captura a tensão clínica",
      "frase_semente": "frase de abertura em linguagem de fala",
      "energia_sugerida": "topo" | "meio" | "fundo"
    }
  ]
}`;

    case "phase3_draft":
      return `Escreva o esboço do roteiro em 5 blocos narrativos.

- tema: ${payload.tema ?? "(vazio)"}
- energia: ${payload.energia ?? "(nenhuma)"}
- objetivo: ${payload.objetivo ?? "(vazio)"}
- insights aprovados: ${JSON.stringify(payload.insights_aprovados ?? [])}
- template: ${payload.script_template ? JSON.stringify(payload.script_template) : "(padrão de 5 blocos)"}

Os 5 papéis na ordem: ${BLOCK_ROLES.join(" / ")}.
Cada bloco em LINGUAGEM DE FALA, curto, sem clichê. Total entre 45 e 65 segundos de fala (~110-170 palavras).

JSON:
{
  "blocos": [
    {
      "papel": "Hook" | "Contexto Emocional" | "Microchoque" | "Insight de Descoberta" | "Resolução",
      "texto": "string",
      "nota_gravacao": "string curta com instrução de entrega"
    }
  ]
}`;

    case "phase3_adjust":
      return `Ajuste APENAS os blocos que precisam de correção. Mantenha os demais idênticos.

BLOCOS ATUAIS: ${JSON.stringify(payload.blocos_atuais ?? [])}

AJUSTES MARCADOS: ${JSON.stringify(payload.ajustes_marcados ?? [])}
INSTRUÇÃO LIVRE: ${payload.instrucao_livre ?? "(nenhuma)"}

JSON:
{
  "blocos_ajustados": [
    { "papel": "string", "texto": "string", "nota_gravacao": "string" }
  ],
  "papeis_modificados": ["lista dos papéis que você alterou"]
}`;

    case "phase3_review":
      return `Faça a análise crítica do roteiro final.

- tema: ${payload.tema ?? "(vazio)"}
- energia: ${payload.energia ?? "(nenhuma)"}
- estratégia: ${payload.creation_strategy ?? "(nenhuma)"}
- objetivo: ${payload.objetivo ?? "(vazio)"}
- blocos finais: ${JSON.stringify(payload.blocos_finais ?? [])}
- memória: ${memoryBlock(payload.ai_memory)}

Avalie retenção, ritmo, posicionamento, ausência de coachês.

JSON:
{
  "score_retencao": número de 0 a 100,
  "estimativa": "baixa" | "moderada" | "alta",
  "pontos_fortes": ["string"],
  "pontos_fracos": [{"ponto": "string", "correcao": "string"}],
  "alerta_posicionamento": "string | null",
  "comentario_final": "string"
}`;

    case "phase4_derivatives":
      return `Transforme o Reel abaixo em 4 formatos derivados. Mantenha a voz da autora (psicóloga clínica), linguagem de fala, sem clichês.

- tema: ${payload.tema ?? "(vazio)"}
- energia: ${payload.energia ?? "(nenhuma)"}
- roteiro final (texto corrido): ${payload.roteiro_final_texto ?? "(vazio)"}

JSON:
{
  "tiktok": {
    "script": "string em linguagem de fala adaptada ao TikTok (mais direta, hook mais agressivo, ~30-45s)",
    "instrucao_gravacao": "string curta com tom/ritmo/enquadramento"
  },
  "carousel": {
    "slides": [
      { "n": 1, "titulo": "string", "corpo": "string" }
    ]
  },
  "stories": {
    "cards": [
      { "n": 1, "tipo": "abertura | enquete | quote | cta | reflexao", "texto": "string", "sugestao_visual": "string" }
    ]
  },
  "debate": {
    "legenda": "string para post de debate nos comentários",
    "intencao": "string curta explicando o objetivo do debate"
  }
}`;
  }
}`;

    case "phase5_performance":
      return `Analise o desempenho real desta peça publicada.

- tema: ${payload.tema ?? "(vazio)"}
- energia: ${payload.energia ?? "(nenhuma)"}
- objetivo: ${payload.objetivo ?? "(vazio)"}
- roteiro (texto): ${payload.roteiro_texto ?? "(vazio)"}
- métricas: ${JSON.stringify(payload.metricas ?? {})}
- comentários recebidos: ${payload.comentarios ?? "(nenhum)"}
- memória de peças anteriores: ${memoryBlock(payload.ai_memory)}

Avalie o resultado de forma honesta e clínica. Identifique o que funcionou, o que não funcionou, e o que aplicar nas próximas peças. Se houver um ângulo forte que merece nova exploração, sinalize.

JSON:
{
  "o_que_funcionou": [{"ponto": "string", "razao": "string"}],
  "o_que_nao_funcionou": [{"ponto": "string", "hipotese": "string", "correcao": "string"}],
  "proximos_conteudos": "string com sugestão aplicável",
  "reuso_sugerido": boolean,
  "memoria_entrada": {
    "tema": "string",
    "energia": "string",
    "resultado": "alto | médio | baixo",
    "aprendizado": "string curta com lição central"
  }
}`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");
    const { action, payload } = await req.json();
    const valid: Action[] = [
      "phase1_read",
      "phase2_validate",
      "phase3_insights",
      "phase3_draft",
      "phase3_adjust",
      "phase3_review",
      "phase4_derivatives",
      "phase5_performance",
    ];
    if (!action || !valid.includes(action)) {
      return new Response(JSON.stringify({ error: "action inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = promptFor(action as Action, payload ?? {});

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: BASE_CONTEXT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("studio-agent AI error", res.status, errBody);
      let message = "Falha ao consultar a IA. Tente novamente.";
      if (res.status === 429) message = "Muitas requisições. Aguarde alguns segundos.";
      else if (res.status === 402) message = "Créditos de IA esgotados no workspace.";
      return new Response(JSON.stringify({ error: message, status: res.status }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { raw };
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
