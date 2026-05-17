// Habit Gap Analyzer — detecta hábitos com baixa execução e sugere ajustes inteligentes
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL = {
  type: "function",
  function: {
    name: "analyze_habit_gaps",
    description: "Analisa hábitos com baixa execução e sugere ajustes acionáveis.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "1-2 frases de diagnóstico geral." },
        gaps: {
          type: "array",
          description: "Hábitos com problema de execução.",
          items: {
            type: "object",
            properties: {
              habit_id: { type: "string" },
              habit_name: { type: "string" },
              completion_rate: { type: "number", description: "0-100%" },
              root_cause: {
                type: "string",
                enum: ["horario_ruim", "carga_excessiva", "falta_gatilho", "ambiente", "energia_baixa", "frequencia_alta", "objetivo_vago"],
              },
              suggestion: {
                type: "object",
                properties: {
                  action: {
                    type: "string",
                    enum: ["mudar_horario", "reduzir_frequencia", "encadear_a_outro", "simplificar", "pausar", "trocar_dia"],
                  },
                  detail: { type: "string", description: "Frase direta com a mudança específica (ex: 'Mover meditação para 7h, logo após escovar dentes')." },
                  expected_impact: { type: "string", description: "O que melhora se aplicar (1 frase)." },
                },
                required: ["action", "detail", "expected_impact"],
              },
            },
            required: ["habit_id", "habit_name", "completion_rate", "root_cause", "suggestion"],
          },
        },
        winning_pattern: {
          type: "string",
          description: "1 frase: o que está funcionando bem e deve ser replicado.",
        },
        next_test: {
          type: "string",
          description: "1 experimento concreto para testar nos próximos 7 dias.",
        },
      },
      required: ["summary", "gaps", "winning_pattern", "next_test"],
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
    const habits = body.habits ?? [];
    const logs = body.logs ?? [];
    const window_days = body.window_days ?? 14;

    if (habits.length === 0) {
      return new Response(JSON.stringify({ error: "Sem hábitos para analisar" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um chefe de performance pessoal direto e prático.
Analise os hábitos da usuária dos últimos ${window_days} dias e identifique GAPS reais (taxa < 60%).
Para cada gap:
- Identifique a CAUSA RAIZ provável (horário ruim, carga excessiva, falta de gatilho, etc)
- Sugira UMA mudança específica e testável (não vaga)
- Foque em encaixe e contexto (ex: "encadear a um hábito que já funciona")
Aponte 1 padrão vencedor para replicar.
Sugira 1 único experimento para a próxima semana.
Tom: direto, sem rodeios, foco em ação. Português brasileiro.`;

    const ctx = {
      janela_dias: window_days,
      habitos: habits.map((h: any) => ({
        id: h.id,
        nome: h.name,
        frequencia: h.frequency,
        weekdays: h.weekdays,
        time_of_day: h.time_of_day,
        target_per_week: h.target_per_week,
        scope: h.scope,
      })),
      execucoes: logs.map((l: any) => ({
        habit_id: l.habit_id,
        date: l.date,
        done: l.done,
      })),
    };

    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Contexto:\n${JSON.stringify(ctx, null, 2)}` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "analyze_habit_gaps" } },
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
    console.error("habit-gap-analyzer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
