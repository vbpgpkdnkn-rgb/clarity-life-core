// strategic-advisor: Motor único de IA estratégica.
// Recebe TODO o contexto (tarefas, metas, transações, hábitos, agenda, históricos)
// e retorna em UMA chamada: cortes, alertas críticos, diagnóstico de metas,
// padrão financeiro e diagnóstico de consistência. Persiste em ai_insights.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADVISOR_TOOL = {
  type: "function",
  function: {
    name: "set_strategic_advice",
    description: "Conselho estratégico completo do dia.",
    parameters: {
      type: "object",
      properties: {
        cuts: {
          type: "array",
          description: "Tarefas a remover/adiar (ruído, baixo impacto, redundantes). Máximo 5.",
          items: {
            type: "object",
            properties: {
              task_id: { type: "string" },
              title: { type: "string" },
              reason: { type: "string", description: "Por que cortar (5–15 palavras)." },
              action: { type: "string", enum: ["remover", "adiar", "delegar"] },
            },
            required: ["task_id", "title", "reason", "action"],
          },
        },
        critical_alerts: {
          type: "array",
          description: "Alertas críticos (risco, desequilíbrio, queda). Máximo 4.",
          items: {
            type: "object",
            properties: {
              kind: {
                type: "string",
                enum: [
                  "risco_meta",
                  "queda_produtividade",
                  "desequilibrio_vida",
                  "risco_financeiro",
                  "sobrecarga",
                ],
              },
              severity: { type: "string", enum: ["info", "warning", "danger"] },
              title: { type: "string" },
              detail: { type: "string", description: "1–2 frases curtas." },
              action: { type: "string", description: "Ação recomendada (frase imperativa)." },
            },
            required: ["kind", "severity", "title", "detail", "action"],
          },
        },
        goals_diagnosis: {
          type: "array",
          description: "Classificação de cada meta ativa.",
          items: {
            type: "object",
            properties: {
              goal_id: { type: "string" },
              status: { type: "string", enum: ["no_ritmo", "atrasada", "critica", "no_alvo"] },
              advice: { type: "string", enum: ["acelerar", "manter", "ajustar", "abandonar"] },
              note: { type: "string", description: "1 frase com a razão." },
            },
            required: ["goal_id", "status", "advice", "note"],
          },
        },
        financial_pattern: {
          type: "object",
          description: "Padrão financeiro detectado.",
          properties: {
            summary: { type: "string", description: "1 frase resumindo o padrão do mês." },
            risk_level: { type: "string", enum: ["baixo", "medio", "alto"] },
            top_waste: {
              type: "array",
              description: "Categorias/descrições de maior desperdício. Máximo 3.",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  amount: { type: "number" },
                  suggestion: { type: "string" },
                },
                required: ["label", "amount", "suggestion"],
              },
            },
            cut_target: { type: "string", description: "1 corte específico recomendado." },
          },
          required: ["summary", "risk_level", "top_waste", "cut_target"],
        },
        consistency: {
          type: "object",
          description: "Diagnóstico de consistência baseado em conclusão recente.",
          properties: {
            trend: { type: "string", enum: ["subindo", "estavel", "caindo"] },
            note: { type: "string", description: "1 frase do padrão observado." },
            routine_tip: { type: "string", description: "1 ajuste de rotina concreto." },
          },
          required: ["trend", "note", "routine_tip"],
        },
      },
      required: ["cuts", "critical_alerts", "goals_diagnosis", "financial_pattern", "consistency"],
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
    const body = await req.json();
    const { date, scope } = body;

    // Compactar contexto para o modelo
    const ctx = {
      hoje: date,
      escopo: scope,
      tarefas: (body.tasks ?? []).map((t: any) => ({
        id: t.id,
        titulo: t.title,
        prazo: t.due_date,
        prioridade: t.priority,
        status: t.status,
        escopo: t.scope,
        meta: t.goal_id,
      })),
      metas: (body.goals ?? []).map((g: any) => ({
        id: g.id,
        nome: g.name,
        escopo: g.scope,
        prazo: g.deadline,
        progresso_pct: g.pct,
        ritmo: g.pace,
      })),
      financeiro: body.finance ?? {},
      historico_conclusao: body.completion_history ?? [],
      eventos_hoje: (body.events ?? []).map((e: any) => ({
        t: e.title,
        h: e.start_time?.slice(0, 5) ?? null,
      })),
      habitos: body.habits ?? [],
    };

    const systemPrompt = `Você é o CHEFE DE EXECUÇÃO do usuário. Não é coach, não é motivador, não é assistente passivo.
Sua função: cobrar, direcionar, decidir. O usuário precisa sentir cobrança prática e direção clara.

TOM OBRIGATÓRIO:
- Direto e imperativo. Frases curtas (5–18 palavras).
- Use verbos no imperativo: "Conclua", "Corte", "Execute", "Pare de", "Reorganize".
- Aponte o erro/risco ANTES de mandar a ação. Padrão: [diagnóstico curto] + [ação imperativa].
- PROIBIDO: "você pode tentar", "considere", "que tal", "vamos lá", "você consegue", "talvez", "se possível".
- Se houve falha de execução, NOMEIE: "Você não executou X ontem.", "Você está atrasado em Y.".

EXEMPLOS:
ERRADO: "Talvez seja bom revisar essa meta."
CERTO: "Meta X está atrasada 7 dias. Redistribua as tarefas pendentes hoje."
ERRADO: "Considere cortar gastos com delivery."
CERTO: "Delivery consumiu R$ 480 este mês. Corte para 1x/semana já."

RESPONSABILIDADES:
1. CORTES: tarefas de baixo impacto, redundantes ou que sobrecarregam. Use APENAS task_ids reais. Razão direta ("ruído", "duplica X", "baixo retorno").
2. ALERTAS CRÍTICOS: risco real com evidência. Title curto e factual. Detail nomeia o problema. Action é imperativa e específica.
3. DIAGNÓSTICO DE METAS: para cada meta ativa, classifique e ordene a ação. Note começa com o fato ("Atrasada 5 dias", "Pace 30% abaixo").
4. PADRÃO FINANCEIRO: detecte gastos de baixo retorno. cut_target é uma ordem ("Cancele assinatura X", "Reduza Y para R$ Z").
5. CONSISTÊNCIA: se tendência caindo, routine_tip é ajuste concreto e imperativo ("Concentre tarefas pesadas antes das 11h", "Pare de aceitar reuniões depois das 16h").

REGRAS DURAS:
- Máx 5 cortes, máx 4 alertas.
- NUNCA invente IDs.
- NUNCA use linguagem motivacional genérica.
- Toda recomendação termina com uma AÇÃO clara para hoje.
- Português do Brasil.`;

    const userMsg = `Data: ${date}. Escopo: ${scope}.\n\n${JSON.stringify(ctx, null, 2)}`;

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
        tools: [ADVISOR_TOOL],
        tool_choice: { type: "function", function: { name: "set_strategic_advice" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      if (aiResp.status === 429)
        return new Response(JSON.stringify({ error: "Limite de IA atingido. Tente em alguns minutos." }), {
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

    const advice = JSON.parse(toolCall.function.arguments);

    // Persiste insights (1 row por kind para o dia/escopo)
    const kinds = ["cuts", "critical_alerts", "goals_diagnosis", "financial_pattern", "consistency"] as const;
    await supa.from("ai_insights").delete().eq("date", date).eq("scope", scope).in("kind", kinds as any);
    const rows = kinds.map((k) => ({ date, scope, kind: k, payload: (advice as any)[k] }));
    await supa.from("ai_insights").insert(rows);

    return new Response(JSON.stringify({ advice, generated_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("strategic-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
