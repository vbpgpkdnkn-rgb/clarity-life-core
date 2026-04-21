// Content Reuse Suggester: sugere reaproveitamento de conteúdos antigos
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL = {
  type: "function",
  function: {
    name: "suggest_reuse",
    description: "Sugere reaproveitamento de conteúdos antigos.",
    parameters: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          description: "3-5 sugestões de reaproveitamento.",
          items: {
            type: "object",
            properties: {
              piece_id: { type: "string", description: "ID da peça original." },
              original_title: { type: "string" },
              new_format: {
                type: "string",
                enum: ["reels", "carrossel", "texto", "stories", "video", "podcast", "newsletter"],
              },
              new_angle: { type: "string", description: "Novo ângulo/título sugerido." },
              why: { type: "string", description: "Por que reaproveitar (1 frase, baseado em performance ou tema)." },
            },
            required: ["piece_id", "original_title", "new_format", "new_angle", "why"],
          },
        },
      },
      required: ["suggestions"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const body = await req.json();
    const pieces = body.pieces ?? [];
    const metrics = body.metrics ?? [];

    const systemPrompt = `Você é diretora de conteúdo focada em REAPROVEITAMENTO inteligente.
Identifique posts antigos (>30 dias) que podem virar:
- Reels (se o original é texto/carrossel)
- Carrossel (se é texto longo)
- Stories (se traz pergunta ou bastidor)
- Newsletter (se é tema profundo)

Priorize:
- Posts com BOA performance (alto engajamento, salvamentos)
- Temas que voltam a ser relevantes
- Conteúdos que merecem novo formato

Tom direto. Português brasileiro.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Posts:\n${JSON.stringify(pieces, null, 2)}\n\nMétricas:\n${JSON.stringify(metrics, null, 2)}` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "suggest_reuse" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      if (aiResp.status === 429)
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (aiResp.status === 402)
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      return new Response(JSON.stringify({ error: "Falha na IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc?.function?.arguments)
      return new Response(JSON.stringify({ error: "IA não retornou estrutura" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    const result = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("content-reuse-suggest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
