// Content Ideator: sugere temas e formatos de conteúdo para o nicho do usuário
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL = {
  type: "function",
  function: {
    name: "suggest_content",
    description: "Sugere ideias de conteúdo para a área da usuária.",
    parameters: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          description: "5 a 8 ideias acionáveis.",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Título da ideia (gancho, 6-12 palavras)." },
              theme: { type: "string", description: "Tema/categoria (ex: ansiedade, autoestima)." },
              format: {
                type: "string",
                enum: ["reels", "carrossel", "texto", "stories", "video", "podcast", "newsletter"],
              },
              hook: { type: "string", description: "Frase de abertura forte (1-2 linhas)." },
              rationale: { type: "string", description: "Por que essa ideia agora (curtíssimo)." },
            },
            required: ["title", "theme", "format", "hook", "rationale"],
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
    const area = body.area ?? "psicologia clínica e comportamento";
    const scope = body.scope ?? "profissional";
    const existing: string[] = body.existing_themes ?? [];

    const systemPrompt = `Você é uma diretora de conteúdo direta e estratégica.
Sua usuária trabalha com: ${area}.
Sugira 5 a 8 ideias de conteúdo que:
- Resolvam dúvidas comuns do público
- Tenham gancho forte logo no primeiro segundo
- Sejam variadas em formato (reels, carrossel, texto)
- Foquem em transformação real, sem romantização
- Tom direto, focado em execução
Português brasileiro. Evite repetir temas já trabalhados: ${existing.join(", ") || "(nenhum)"}.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Escopo: ${scope}. Gere as ideias.` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "suggest_content" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      if (aiResp.status === 429)
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (aiResp.status === 402)
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      return new Response(JSON.stringify({ error: "Falha na IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc?.function?.arguments)
      return new Response(JSON.stringify({ error: "IA não retornou estrutura" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    const parsed = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("content-ideator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
