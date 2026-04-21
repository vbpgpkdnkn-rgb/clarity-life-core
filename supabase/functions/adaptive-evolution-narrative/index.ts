// adaptive-evolution-narrative: lê comparativos já calculados no cliente
// e devolve 1-2 frases no tom "chefe de execução" + persiste em ai_insights.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL = {
  type: "function",
  function: {
    name: "set_evolution_narrative",
    description: "Leitura factual da evolução do usuário ao longo das semanas.",
    parameters: {
      type: "object",
      properties: {
        narrative: {
          type: "string",
          description:
            "1–2 frases. Padrão: [fato com números] + [veredito imperativo]. Ex: 'Sua execução subiu de 52% para 71% em 4 semanas. Mantenha a carga atual e foque em consistência.'",
        },
        verdict: {
          type: "string",
          enum: ["melhorando", "piorando", "estavel", "sem_dados"],
        },
      },
      required: ["narrative", "verdict"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { scope = "todos", summary } = await req.json();

    if (!summary || !summary.current) {
      return new Response(
        JSON.stringify({
          narrative:
            "Sem histórico suficiente. Execute pelo menos 2 semanas para gerar leitura de evolução.",
          verdict: "sem_dados",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `Você é o REGULADOR ADAPTATIVO. Lê histórico de execução e dá veredito factual.

REGRAS:
- Tom imperativo, factual. Sempre cite NÚMEROS (ex: "subiu de 52% para 71%").
- Estrutura: [fato comparativo] + [ordem/veredito].
- Idioma: português do Brasil.
- 1–2 frases. Máx 220 caracteres.
- PROIBIDO: "tente", "talvez", "considere", motivação genérica, elogios vagos.
- Se trajectory='melhorando': reconheça o ganho factualmente e ordene manter o ritmo.
- Se trajectory='piorando': nomeie a queda e ordene ação corretiva (reduzir carga, focar consistência).
- Se trajectory='estavel': diga que está estagnado e indique o próximo passo.
- Se profileChanged=true: mencione a mudança de perfil explicitamente.`;

    const userMsg = `Escopo: ${scope}.
Semanas registradas: ${summary.weeks_count}.
Trajetória: ${summary.trajectory}.
Mudou de perfil: ${summary.profileChanged}.

ATUAL (${summary.current.week_start}): perfil=${summary.current.profile}, execução=${summary.current.execution_rate}%, consistência=${summary.current.consistency_score}%, sobrecarga=${summary.current.overload_score}%, abandono=${summary.current.abandonment_rate}%.

4 SEMANAS ATRÁS (${summary.fourWeeksAgo?.week_start}): perfil=${summary.fourWeeksAgo?.profile}, execução=${summary.fourWeeksAgo?.execution_rate}%, consistência=${summary.fourWeeksAgo?.consistency_score}%.

MELHOR SEMANA: ${summary.best?.week_start} (${summary.best?.execution_rate}%).
PIOR SEMANA: ${summary.worst?.week_start} (${summary.worst?.execution_rate}%).

DELTAS (atual vs 4 sem):
${(summary.deltas ?? []).map((d: any) => `- ${d.label}: ${d.previous}% → ${d.current}% (Δ ${d.delta > 0 ? "+" : ""}${d.delta}pp)`).join("\n")}

Gere a narrativa.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "set_evolution_narrative" } },
      }),
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
      return new Response(JSON.stringify({ error: "IA não retornou estrutura" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Persiste como insight (substitui anterior do mesmo escopo da semana)
    await supa.from("ai_insights").insert({
      scope,
      kind: "evolution_narrative",
      payload: {
        narrative: result.narrative,
        verdict: result.verdict,
        summary,
      },
    });

    return new Response(
      JSON.stringify({ narrative: result.narrative, verdict: result.verdict }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("adaptive-evolution-narrative error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
