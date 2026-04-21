// Content Weekly Plan: gera plano editorial semanal e ação do dia
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL = {
  type: "function",
  function: {
    name: "set_weekly_plan",
    description: "Define o plano de conteúdo semanal e ação do dia.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "1-2 frases de diagnóstico da semana." },
        schedule: {
          type: "array",
          description: "Itens do plano semanal (até 5 dias).",
          items: {
            type: "object",
            properties: {
              day: { type: "string", description: "Dia da semana (segunda, terça…)" },
              title: { type: "string" },
              format: {
                type: "string",
                enum: ["reels", "carrossel", "texto", "stories", "video", "podcast", "newsletter"],
              },
              reason: { type: "string", description: "Por que postar isso nesse dia." },
              piece_id: { type: ["string", "null"], description: "ID da peça existente, se houver." },
            },
            required: ["day", "title", "format", "reason"],
          },
        },
        adjustments: {
          type: "array",
          description: "Ajustes para a semana (cortes, prioridades, redução de carga).",
          items: { type: "string" },
        },
        today_action: {
          type: "string",
          description: "Ação concreta para hoje (1 frase direta, ex: 'Hoje grave o reels X').",
        },
      },
      required: ["summary", "schedule", "adjustments", "today_action"],
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
    const scope = body.scope ?? "profissional";
    const target = body.target_per_week ?? 3;
    const pieces = body.pieces ?? [];
    const ideas = body.ideas ?? [];
    const consistency = body.consistency_pct ?? 0;

    const systemPrompt = `Você é diretora de conteúdo direta. Tom: sem romantização, focado em execução.
Monte um plano editorial semanal real, baseado em:
- Meta: ${target} posts por semana
- Consistência atual: ${consistency}%
- Backlog de peças e ideias da usuária
- Se atrasada, REDUZA a carga (não empilhe). Mantenha consistência.
- Priorize peças que já existem antes de criar novas.
- Action do dia: 1 frase direta sobre o que produzir HOJE.
Português brasileiro.`;

    const ctx = {
      escopo: scope,
      meta_semanal: target,
      consistencia_pct: consistency,
      pecas: pieces,
      ideias: ideas,
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Contexto:\n${JSON.stringify(ctx, null, 2)}` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "set_weekly_plan" } },
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
    const plan = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify({ plan, generated_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("content-weekly-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
