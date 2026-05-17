// Book Reading Plan: calcula plano de leitura inteligente baseado em páginas, prazo e ritmo.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL = {
  type: "function",
  function: {
    name: "build_reading_plan",
    description: "Monta plano realista de leitura.",
    parameters: {
      type: "object",
      properties: {
        pages_per_session: { type: "number", description: "Páginas a ler por sessão." },
        sessions_per_week: { type: "number", description: "Sessões por semana (1-7)." },
        weekdays: {
          type: "array",
          items: { type: "number" },
          description: "Dias da semana (0=domingo a 6=sábado).",
        },
        session_minutes: { type: "number", description: "Minutos estimados por sessão." },
        target_finish_date: { type: "string", description: "Data prevista de término (YYYY-MM-DD)." },
        total_weeks: { type: "number", description: "Quantas semanas o plano cobre." },
        rationale: { type: "string", description: "Resumo curto do raciocínio (1-3 linhas)." },
        weekly_milestones: {
          type: "array",
          items: { type: "string" },
          description: "Marcos por semana (ex: 'Sem 1: pág 1-50').",
        },
      },
      required: ["pages_per_session", "sessions_per_week", "weekdays", "session_minutes", "target_finish_date", "total_weeks", "rationale", "weekly_milestones"],
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
    const { title, author, pages, current_page, deadline, available_minutes_per_day, preferred_weekdays } = body;

    const remaining = Math.max(0, (pages ?? 0) - (current_page ?? 0));
    const today = new Date().toISOString().slice(0, 10);

    const systemPrompt = `Você é uma coach de leitura prática. Monte um plano REALISTA e SUSTENTÁVEL.

Regras:
- Considere ritmo médio: 1 página = ~2 min de leitura atenta.
- Distribua em sessões curtas (15-45 min).
- Se houver prazo, calcule para terminar 3 dias antes (margem).
- Se NÃO houver prazo, proponha terminar em até 8 semanas.
- Escolha 3-5 dias da semana (evite sobrecarregar).
- Pages/sessão deve ser número inteiro razoável (5-40).
- Gere 4-8 marcos semanais claros ("Sem 1: pág X-Y, capítulo Z").

Português brasileiro. Seja direta.`;

    const userPrompt = `Livro: "${title}"${author ? ` de ${author}` : ""}
Páginas totais: ${pages || "desconhecido"}
Página atual: ${current_page || 0}
Páginas restantes: ${remaining}
Prazo desejado: ${deadline || "sem prazo definido"}
Hoje: ${today}
Tempo disponível/dia: ${available_minutes_per_day || 30} min
Dias preferidos: ${preferred_weekdays?.length ? preferred_weekdays.join(",") : "a definir"}

Monte o plano.`;

    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "build_reading_plan" } },
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
    console.error("book-reading-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
