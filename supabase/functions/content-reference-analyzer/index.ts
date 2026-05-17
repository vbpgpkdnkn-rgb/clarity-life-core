// Content Reference Analyzer: analisa post de referência e adapta para o nicho da usuária
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL = {
  type: "function",
  function: {
    name: "adapt_reference",
    description: "Analisa post de referência e adapta para o nicho da usuária.",
    parameters: {
      type: "object",
      properties: {
        source_analysis: {
          type: "object",
          description: "Análise do post original.",
          properties: {
            theme: { type: "string", description: "Tema central." },
            structure: { type: "string", description: "Estrutura/formato do post original." },
            why_it_works: { type: "string", description: "Por que esse post funciona (gancho, dor, prova social, etc)." },
          },
          required: ["theme", "structure", "why_it_works"],
        },
        adapted: {
          type: "object",
          description: "Versão adaptada para o nicho da usuária.",
          properties: {
            title: { type: "string", description: "Título/gancho adaptado." },
            format: {
              type: "string",
              enum: ["reels", "carrossel", "texto", "stories", "video", "podcast", "newsletter"],
            },
            hook: { type: "string", description: "Frase de abertura forte." },
            outline: { type: "string", description: "Estrutura/roteiro completo (3-7 pontos)." },
            cta: { type: "string", description: "CTA final." },
          },
          required: ["title", "format", "hook", "outline", "cta"],
        },
        strategic_note: { type: "string", description: "1 frase: por que postar isso agora no contexto da usuária." },
      },
      required: ["source_analysis", "adapted", "strategic_note"],
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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurado");

    const body = await req.json();
    const sourceText = body.source_text ?? "";
    const sourceUrl = body.source_url ?? "";
    const sourceAuthor = body.source_author ?? "";
    const niche = body.niche ?? "psicologia clínica e comportamento";
    const ownThemes: string[] = body.own_themes ?? [];
    const briefing: string = body.briefing ?? "";

    if (!sourceText && !sourceUrl) {
      return new Response(JSON.stringify({ error: "Forneça source_text ou source_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é diretora de conteúdo estratégica e direta, ESPECIALISTA no nicho da usuária.

${briefing ? `BRIEFING DE ESTRATÉGIA:\n${briefing}\n\n` : `A usuária trabalha com: ${niche}.\n`}
Temas que ela já trabalha: ${ownThemes.join(", ") || "(geral)"}.

Sua tarefa:
1. Analise o post de referência (entender por que funciona)
2. Adapte para o nicho/ICP/tom da usuária mantendo o ESQUELETO do que funciona
3. NUNCA copie literalmente. Sempre traga para a área dela respeitando o tom assinatura.
4. Tom: direto, sem romantização, foco em transformação real.

Português brasileiro.`;

    const userMsg = `Post de referência:
${sourceAuthor ? `Autor: ${sourceAuthor}\n` : ""}${sourceUrl ? `Link: ${sourceUrl}\n` : ""}
${sourceText ? `Conteúdo:\n${sourceText}` : "(sem texto colado, use o contexto do link)"}`;

    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "adapt_reference" } },
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
    const result = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("content-reference-analyzer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
