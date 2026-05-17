// Content Reuse Suggester: sugere reaproveitamento de conteúdos antigos
import { aiFetch } from "../_shared/anthropic.ts";
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

    const aiResp = await aiFetch({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Posts:\n${JSON.stringify(pieces, null, 2)}\n\nMétricas:\n${JSON.stringify(metrics, null, 2)}` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "suggest_reuse" } },
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
