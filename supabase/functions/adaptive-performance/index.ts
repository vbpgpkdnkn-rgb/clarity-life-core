// adaptive-performance: motor de IA adaptativa.
// Recebe métricas comportamentais (já calculadas no cliente) + histórico de ajustes.
// Devolve: perfil de execução, recomendação de carga, narrativa direta e ajustes sugeridos.
// Persiste 1 perfil por (semana, escopo, janela) e cria adjustments com status='sugerido'.
import { aiFetch } from "../_shared/anthropic.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL = {
  type: "function",
  function: {
    name: "set_adaptive_profile",
    description: "Perfil adaptativo + ajustes sugeridos.",
    parameters: {
      type: "object",
      properties: {
        profile: { type: "string", enum: ["alta", "media", "baixa", "inconsistente"] },
        recommended_load: {
          type: "integer",
          description: "Tarefas/dia recomendadas. Ajuste GRADUAL: máximo ±2 vs atual.",
        },
        narrative: {
          type: "string",
          description:
            "1–2 frases diretas. Padrão: [fato observado] + [ajuste aplicado/sugerido]. Tom de chefe de execução. Ex: 'Sua execução caiu para 45% nos últimos 7 dias. Reduzi sua carga diária para 3 tarefas.'",
        },
        adjustments: {
          type: "array",
          description: "Ajustes sugeridos. Máximo 3. Só inclua se há padrão >=7 dias.",
          items: {
            type: "object",
            properties: {
              area: { type: "string", enum: ["carga", "meta", "foco", "financeiro"] },
              kind: {
                type: "string",
                enum: [
                  "reduzir_carga",
                  "aumentar_carga",
                  "adiar_prazo",
                  "cortar_escopo",
                  "ajuste_foco",
                  "alerta_gasto",
                ],
              },
              goal_id: { type: "string", description: "ID da meta afetada (se area=meta)." },
              rationale: {
                type: "string",
                description: "Frase imperativa explicando o porquê. Máx 140 chars.",
              },
              from_value: { type: "number" },
              to_value: { type: "number" },
            },
            required: ["area", "kind", "rationale"],
          },
        },
        insights: {
          type: "object",
          description: "Padrões detectados.",
          properties: {
            peak_window: { type: "string", description: "Janela do dia mais produtiva, se identificável." },
            risk_pattern: { type: "string", description: "Ex: 'procrastinação às sextas', 'sobrecarga 2ª/3ª'." },
            financial_pattern: { type: "string", description: "Padrão de gasto recorrente." },
          },
        },
      },
      required: ["profile", "recommended_load", "narrative", "adjustments"],
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await req.json();
    const {
      week_start,
      scope = "todos",
      window_days = 7,
      metrics, // { execution_rate, consistency_score, overload_score, abandonment_rate, productive_days, unproductive_days, avg_tasks_per_day, current_load, daily_history, financial }
      goals = [],
      last_adjustments = [],
    } = body;

    if (!week_start || !metrics) {
      return new Response(JSON.stringify({ error: "week_start e metrics são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TRAVA: bloqueia ajustes em áreas que tiveram ajuste há <7 dias
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: recentAdj } = await supa
      .from("performance_adjustments")
      .select("area, created_at")
      .eq("scope", scope)
      .gte("created_at", sevenDaysAgo);
    const lockedAreas = new Set((recentAdj ?? []).map((a: any) => a.area));

    const systemPrompt = `Você é o REGULADOR ADAPTATIVO de performance. Não é coach. Não motiva. Observa padrão e ajusta carga.

PRINCÍPIOS:
- AJUSTE GRADUAL: nunca mexa carga em mais de ±2 tarefas/dia por semana.
- ESTABILIDADE: só sugira ajuste se padrão é consistente (mín 7 dias). Ignore picos isolados.
- CONTROLE DO USUÁRIO: metas com locked=true são INTOCÁVEIS. Não inclua em adjustments.
- ÁREAS BLOQUEADAS (ajuste recente <7d): ${[...lockedAreas].join(", ") || "nenhuma"}. NÃO sugira nada nessas áreas.

REGRAS DE PERFIL:
- "alta": execution_rate >= 85% E consistency >= 70.
- "media": execution_rate 60–85%.
- "baixa": execution_rate < 60%.
- "inconsistente": consistency < 40 (independente da taxa).

REGRAS DE CARGA:
- baixa → reduzir 1–2 tarefas/dia.
- alta → aumentar 1 tarefa/dia (gradual).
- inconsistente → fixar carga baixa (2–3) para criar ritmo.
- media → manter.

TOM da narrative e rationale:
- Imperativo, factual. Padrão: "[fato com número] + [ação aplicada]".
- PROIBIDO: "tente", "talvez", "considere", motivação genérica.
- Idioma: português do Brasil.`;

    const userMsg = `Semana: ${week_start}. Escopo: ${scope}. Janela: ${window_days}d.

MÉTRICAS:
${JSON.stringify(metrics, null, 2)}

METAS ATIVAS:
${JSON.stringify(goals, null, 2)}

AJUSTES RECENTES (últimos 14d):
${JSON.stringify(last_adjustments, null, 2)}

Classifique perfil, defina carga recomendada, gere narrativa e até 3 ajustes (respeitando travas).`;

    const aiResp = await aiFetch({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "set_adaptive_profile" } },
      });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      if (aiResp.status === 429)
        return new Response(JSON.stringify({ error: "Limite de IA atingido." }), {
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("Sem tool_call:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "IA não retornou estrutura" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Filtra ajustes em metas locked + áreas bloqueadas (defesa em profundidade)
    const lockedGoalIds = new Set(
      (goals as any[]).filter((g) => g.locked).map((g) => g.id),
    );
    const filteredAdj = (result.adjustments ?? []).filter((a: any) => {
      if (lockedAreas.has(a.area)) return false;
      if (a.area === "meta" && a.goal_id && lockedGoalIds.has(a.goal_id)) return false;
      return true;
    });

    // Persiste perfil (upsert por week+scope+window)
    await supa
      .from("performance_profiles")
      .upsert(
        {
          week_start,
          scope,
          window_days,
          profile: result.profile,
          execution_rate: metrics.execution_rate ?? 0,
          consistency_score: metrics.consistency_score ?? 0,
          overload_score: metrics.overload_score ?? 0,
          abandonment_rate: metrics.abandonment_rate ?? 0,
          productive_days: metrics.productive_days ?? 0,
          unproductive_days: metrics.unproductive_days ?? 0,
          avg_tasks_per_day: metrics.avg_tasks_per_day ?? 0,
          recommended_load: result.recommended_load,
          insights: result.insights ?? {},
          narrative: result.narrative,
        },
        { onConflict: "week_start,scope,window_days" },
      );

    // Persiste ajustes sugeridos
    if (filteredAdj.length > 0) {
      const rows = filteredAdj.map((a: any) => ({
        scope,
        area: a.area,
        goal_id: a.goal_id || null,
        kind: a.kind,
        rationale: a.rationale,
        status: "sugerido",
        payload: {
          from_value: a.from_value,
          to_value: a.to_value,
        },
      }));
      await supa.from("performance_adjustments").insert(rows);
    }

    return new Response(
      JSON.stringify({
        profile: result.profile,
        recommended_load: result.recommended_load,
        narrative: result.narrative,
        adjustments: filteredAdj,
        insights: result.insights ?? {},
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("adaptive-performance error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
