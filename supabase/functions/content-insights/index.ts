// Content Insights: analisa performance e identifica padrões
import { aiFetch } from "../_shared/anthropic.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL = {
  type: "function",
  function: {
    name: "set_insights",
    description: "Define padrões de performance e recomendações.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "1 frase resumindo o padrão principal." },
        top_themes: {
          type: "array",
          description: "Temas que mais performam (até 3).",
          items: {
            type: "object",
            properties: {
              theme: { type: "string" },
              evidence: { type: "string", description: "Por que (ex: '3 posts, média 1200 likes')." },
            },
            required: ["theme", "evidence"],
          },
        },
        top_formats: {
          type: "array",
          description: "Formatos com melhor engajamento (até 3).",
          items: {
            type: "object",
            properties: {
              format: { type: "string" },
              evidence: { type: "string" },
            },
            required: ["format", "evidence"],
          },
        },
        recommendations: {
          type: "array",
          description: "3 recomendações acionáveis (1 frase cada, direta).",
          items: { type: "string" },
        },
        reuse_suggestions: {
          type: "array",
          description: "Conteúdos antigos para reaproveitar (até 3).",
          items: {
            type: "object",
            properties: {
              piece_id: { type: "string" },
              title: { type: "string" },
              new_format: {
                type: "string",
                enum: ["reels", "carrossel", "texto", "stories", "video", "podcast", "newsletter"],
              },
              why: { type: "string" },
            },
            required: ["title", "new_format", "why"],
          },
        },
      },
      required: ["summary", "top_themes", "top_formats", "recommendations", "reuse_suggestions"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Require authenticated user (single-user lockdown)
  const _authHeader = req.headers.get("Authorization");
  if (!_authHeader || !_authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const _supa = (await import("https://esm.sh/@supabase/supabase-js@2.45.0")).createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: _authHeader } } }
    );
    const { data: _u, error: _e } = await _supa.auth.getUser(_authHeader.replace("Bearer ", ""));
    if (_e || !_u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {

    const body = await req.json();
    const pieces = body.pieces ?? [];
    const metrics = body.metrics ?? [];

    const systemPrompt = `Você é uma analista de conteúdo direta e estratégica.
Analise os dados de posts e métricas e identifique:
- Quais TEMAS performam melhor (engajamento, alcance, salvamentos)
- Quais FORMATOS geram mais resultado
- Padrões para REPETIR
- Conteúdos antigos para REAPROVEITAR em outro formato

Tom: direto, sem romantização, baseado em dados reais.
Português brasileiro. Se não houver dados suficientes, diga isso na summary.`;

    const ctx = { posts: pieces, metricas: metrics };

    const aiResp = await aiFetch({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dados:\n${JSON.stringify(ctx, null, 2)}` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "set_insights" } },
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
    const insights = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify({ insights, generated_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("content-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
