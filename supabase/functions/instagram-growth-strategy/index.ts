const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Snapshot {
  week_start: string;
  followers: number;
  followers_gained: number;
  followers_lost: number;
  reach: number;
  impressions: number;
  profile_visits: number;
  website_clicks: number;
  dms_received: number;
  appointments_booked: number;
}

interface Piece {
  id: string;
  title: string;
  theme: string | null;
  format: string;
  hook: string | null;
  cta: string | null;
  cta_type: string | null;
  published_at: string | null;
  generated_dms: number;
  booked_appointment: boolean;
}

interface Metric {
  piece_id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  engagement_rate: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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
    const { scope, snapshots = [], pieces = [], metrics = [] } = await req.json() as {
      scope: string;
      snapshots: Snapshot[];
      pieces: Piece[];
      metrics: Metric[];
    };

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    // Pré-cálculos determinísticos (entrega contexto rico para a IA)
    const sorted = [...snapshots].sort((a, b) => a.week_start.localeCompare(b.week_start));
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const growthPctWeek = (last && prev && prev.followers > 0)
      ? Number((((last.followers - prev.followers) / prev.followers) * 100).toFixed(2))
      : 0;

    const last4 = sorted.slice(-4);
    const totalGained = last4.reduce((s, x) => s + (x.followers_gained || 0), 0);
    const totalDms = last4.reduce((s, x) => s + (x.dms_received || 0), 0);
    const totalAppointments = last4.reduce((s, x) => s + (x.appointments_booked || 0), 0);
    const totalReach = last4.reduce((s, x) => s + (x.reach || 0), 0);

    // Cruzar peças × métricas × captação
    const enriched = pieces.map((p) => {
      const m = metrics.find((x) => x.piece_id === p.id);
      return { ...p, metric: m };
    });

    // Conversão por tema
    const themeStats: Record<string, { posts: number; dms: number; appts: number; engagement: number }> = {};
    for (const p of enriched) {
      if (!p.theme || !p.published_at) continue;
      const t = p.theme;
      themeStats[t] ??= { posts: 0, dms: 0, appts: 0, engagement: 0 };
      themeStats[t].posts += 1;
      themeStats[t].dms += p.generated_dms || 0;
      themeStats[t].appts += p.booked_appointment ? 1 : 0;
      themeStats[t].engagement += p.metric?.engagement_rate ?? 0;
    }

    // Conversão por formato
    const formatStats: Record<string, { posts: number; dms: number; appts: number; reach: number }> = {};
    for (const p of enriched) {
      if (!p.published_at) continue;
      formatStats[p.format] ??= { posts: 0, dms: 0, appts: 0, reach: 0 };
      formatStats[p.format].posts += 1;
      formatStats[p.format].dms += p.generated_dms || 0;
      formatStats[p.format].appts += p.booked_appointment ? 1 : 0;
      formatStats[p.format].reach += p.metric?.reach ?? 0;
    }

    // Conversão por CTA
    const ctaStats: Record<string, { posts: number; dms: number; appts: number }> = {};
    for (const p of enriched) {
      if (!p.cta_type || !p.published_at) continue;
      ctaStats[p.cta_type] ??= { posts: 0, dms: 0, appts: 0 };
      ctaStats[p.cta_type].posts += 1;
      ctaStats[p.cta_type].dms += p.generated_dms || 0;
      ctaStats[p.cta_type].appts += p.booked_appointment ? 1 : 0;
    }

    const systemPrompt = `Você é uma estrategista sênior de Instagram para psicólogas em consultório próprio.
Seu objetivo NÃO é "criar conteúdo bonito" — é gerar 2 resultados mensuráveis:
1. CRESCIMENTO de seguidores qualificados (potenciais pacientes)
2. CAPTAÇÃO: DMs e agendamentos vindos do Instagram

Você é direta, baseada em dados, e nunca dá conselho genérico ("seja autêntica", "poste com consistência" sozinho não vale).
Sempre recomende com base nos dados fornecidos. Se faltam dados, diga claramente.
Linguagem: PT-BR, segunda pessoa, prática.`;

    const userPrompt = `Analise esta conta de Instagram (escopo: ${scope}) e devolva diagnóstico + alavancas de crescimento e captação.

# Snapshots semanais (${snapshots.length} semanas)
${JSON.stringify(sorted.slice(-8), null, 0)}

# Métricas agregadas últimas 4 semanas
- Seguidores ganhos: ${totalGained}
- DMs recebidas: ${totalDms}
- Agendamentos via IG: ${totalAppointments}
- Alcance total: ${totalReach}
- Crescimento semanal % (última vs anterior): ${growthPctWeek}%

# Performance por TEMA (posts publicados)
${JSON.stringify(themeStats, null, 0)}

# Performance por FORMATO
${JSON.stringify(formatStats, null, 0)}

# Performance por TIPO DE CTA
${JSON.stringify(ctaStats, null, 0)}

# Total de peças publicadas: ${pieces.filter((p) => p.published_at).length}
# Posts que geraram DM: ${pieces.filter((p) => (p.generated_dms || 0) > 0).length}
# Posts que geraram agendamento: ${pieces.filter((p) => p.booked_appointment).length}

Devolva JSON via tool call. Seja específica: cite TEMAS reais que aparecem nos dados, não genéricos.`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "growth_strategy",
              description: "Estratégia de crescimento e captação para Instagram",
              parameters: {
                type: "object",
                properties: {
                  diagnosis: {
                    type: "object",
                    properties: {
                      growth_phase: { type: "string", enum: ["estagnada", "lenta", "saudavel", "acelerada"] },
                      growth_rate_weekly_pct: { type: "number" },
                      acquisition_health: { type: "string", enum: ["fraca", "razoavel", "forte"] },
                      summary: { type: "string", description: "2-3 frases diretas, baseadas em dados" },
                    },
                    required: ["growth_phase", "growth_rate_weekly_pct", "acquisition_health", "summary"],
                  },
                  growth_levers: {
                    type: "array",
                    description: "3-5 alavancas de CRESCIMENTO de audiência (temas/formatos com maior potencial)",
                    items: {
                      type: "object",
                      properties: {
                        theme: { type: "string" },
                        format: { type: "string" },
                        why: { type: "string", description: "Citar dado real" },
                        expected_impact: { type: "string", enum: ["alto", "medio", "baixo"] },
                      },
                      required: ["theme", "format", "why", "expected_impact"],
                    },
                  },
                  acquisition_levers: {
                    type: "array",
                    description: "3-5 alavancas de CAPTAÇÃO de pacientes (CTA + tema que converte)",
                    items: {
                      type: "object",
                      properties: {
                        cta_type: { type: "string", description: "autoridade | dor | convite | educativo | bastidor | depoimento" },
                        theme: { type: "string" },
                        why: { type: "string" },
                        example_hook: { type: "string", description: "Exemplo concreto de hook que gere DM" },
                      },
                      required: ["cta_type", "theme", "why", "example_hook"],
                    },
                  },
                  ideal_frequency: {
                    type: "object",
                    properties: {
                      posts_per_week: { type: "number" },
                      stories_per_day: { type: "number" },
                      rationale: { type: "string" },
                    },
                    required: ["posts_per_week", "stories_per_day", "rationale"],
                  },
                  warnings: {
                    type: "array",
                    description: "Riscos detectados: queda, estagnação, captação zero, tema saturado, etc.",
                    items: {
                      type: "object",
                      properties: {
                        kind: { type: "string" },
                        detail: { type: "string" },
                      },
                      required: ["kind", "detail"],
                    },
                  },
                  next_week_focus: {
                    type: "string",
                    description: "1 frase: a coisa mais importante para fazer na próxima semana",
                  },
                },
                required: ["diagnosis", "growth_levers", "acquisition_levers", "ideal_frequency", "warnings", "next_week_focus"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "growth_strategy" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de uso da IA atingido. Tente novamente em alguns minutos." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos em Settings > Workspace > Usage." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error ${response.status}`);
    }

    const json = await response.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Resposta da IA sem tool call");

    const strategy = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ strategy, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("instagram-growth-strategy error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
