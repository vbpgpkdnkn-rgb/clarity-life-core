// Goal Redistribute — Ajuste automático
// Recebe: meta + tarefas pendentes vinculadas + carga atual
// Devolve: novas due_dates para tarefas pendentes, ajuste de prazo, sugestão de redução de escopo
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCHEMA = {
  type: "object",
  properties: {
    diagnosis: {
      type: "string",
      enum: ["no_ritmo", "atrasada", "critica"],
    },
    summary: { type: "string", description: "Diagnóstico curto, máx 200 chars." },
    new_deadline: {
      type: "string",
      description: "Data ISO ou string vazia se não mudar.",
    },
    drop_tasks: {
      type: "array",
      description: "IDs de tarefas que devem ser removidas (escopo cortado).",
      items: { type: "string" },
    },
    reschedule: {
      type: "array",
      items: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          new_due_date: { type: "string", description: "Nova data ISO YYYY-MM-DD." },
          reason: { type: "string" },
        },
        required: ["task_id", "new_due_date"],
        additionalProperties: false,
      },
    },
    next_action: { type: "string", description: "Ação imediata para hoje." },
  },
  required: ["diagnosis", "summary", "reschedule", "drop_tasks", "next_action"],
  additionalProperties: false,
};

const SYSTEM = `Você é o CHEFE DE EXECUÇÃO. A meta está em risco. Reanalise e mande o plano de correção.

TOM:
- Imperativo, direto, factual. Frases curtas.
- summary começa com o FATO ("Meta atrasada 8 dias, ritmo 40% abaixo") + decisão ("Redistribua as 5 pendentes nos próximos 7 dias.").
- next_action é uma ORDEM executável hoje ("Conclua a tarefa X agora antes de qualquer outra coisa.").
- reason em cada reschedule é factual e curto ("Dia atual sobrecarregado", "Antecipa entrega crítica").
- PROIBIDO: "tente", "que tal", "considere", "talvez", motivação genérica.

REGRAS:
- Se prazo é viável: redistribua pendentes nos próximos dias. Máx 2 desta meta por dia. Respeite carga existente.
- Se inviável: defina NEW_DEADLINE realista OU drop_tasks (corte escopo). Não as duas coisas se uma já resolve.
- Idioma: português do Brasil.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { goal, pending_tasks = [], today, load_by_day = {} } = body;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const userPrompt = `META: ${goal.name}
Prazo atual: ${goal.deadline || "sem prazo"}
Hoje: ${today}
Progresso: ${goal.progress?.pct ?? 0}%
Pace: ${goal.progress?.pace ?? "desconhecido"}

TAREFAS PENDENTES VINCULADAS:
${JSON.stringify(pending_tasks, null, 2)}

CARGA ATUAL POR DIA:
${JSON.stringify(load_by_day)}

Reanalise. Diagnóstico + plano de ajuste.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_redistribution",
              parameters: SCHEMA,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_redistribution" } },
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI falhou");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Sem tool_call");
    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("goal-redistribute error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
