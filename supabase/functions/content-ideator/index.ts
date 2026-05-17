// Content Ideator: sugere temas e formatos de conteúdo para o nicho do usuário
import { aiFetch } from "../_shared/anthropic.ts";
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
    const area = body.area ?? "psicologia clínica e comportamento";
    const scope = body.scope ?? "profissional";
    const existing: string[] = body.existing_themes ?? [];
    const briefing: string = body.briefing ?? "";

    const systemPrompt = `Você é uma diretora de conteúdo direta, estratégica e ESPECIALISTA NO NICHO da usuária.

${briefing ? `BRIEFING DE ESTRATÉGIA DA USUÁRIA:\n${briefing}\n\nUse esse briefing como sua bíblia. Toda ideia deve respeitar nicho, ICP, tom e pilares.\n` : `Sua usuária trabalha com: ${area}.\n`}
Sugira 5 a 8 ideias de conteúdo que:
- Resolvam dúvidas reais do ICP descrito
- Tenham gancho forte logo no primeiro segundo
- Variedade de formato (reels, carrossel, texto)
- Foquem em transformação real, sem romantização
- Respeitem o tom assinatura
- Conectem com a oferta principal sem soar comercial
Português brasileiro. Evite repetir temas já trabalhados: ${existing.join(", ") || "(nenhum)"}.`;

    const aiResp = await aiFetch({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Escopo: ${scope}. Gere as ideias.` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "suggest_content" } },
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
