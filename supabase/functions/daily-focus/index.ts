// Daily Focus AI: gera prioridade principal, top 3, "não fazer" e ajuste de carga
// usando Lovable AI Gateway (Gemini). Recebe contexto de tarefas/metas/eventos.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  priority: "alta" | "media" | "baixa";
  status: string;
  scope: string;
  goal_id?: string | null;
}
interface Goal {
  id: string;
  name: string;
  scope: string;
  deadline: string | null;
  pct?: number;
  pace?: string;
}
interface Event {
  title: string;
  start_time: string | null;
  end_time: string | null;
  scope: string;
}

interface Payload {
  date: string; // YYYY-MM-DD
  scope: "todos" | "pessoal" | "profissional";
  tasks: Task[];
  goals: Goal[];
  events: Event[];
}

const FOCUS_TOOL = {
  type: "function",
  function: {
    name: "set_daily_focus",
    description: "Define o plano de foco do dia.",
    parameters: {
      type: "object",
      properties: {
        main_priority: {
          type: "object",
          description: "A prioridade principal do dia (1 só).",
          properties: {
            task_id: {
              type: ["string", "null"],
              description: "ID da tarefa selecionada (do contexto), ou null se for objetivo livre.",
            },
            title: { type: "string" },
            why: { type: "string", description: "1 frase: por que essa é a prioridade." },
          },
          required: ["title", "why"],
        },
        top_three: {
          type: "array",
          description: "As 3 tarefas mais relevantes (incluindo a principal). Máximo 3.",
          items: {
            type: "object",
            properties: {
              task_id: { type: "string" },
              title: { type: "string" },
              reason: { type: "string", description: "Curtíssima razão (5–10 palavras)." },
            },
            required: ["task_id", "title", "reason"],
          },
        },
        do_not_do: {
          type: "array",
          description: "Tarefas a ignorar/adiar hoje. Máximo 3.",
          items: {
            type: "object",
            properties: {
              task_id: { type: "string" },
              title: { type: "string" },
              reason: { type: "string" },
            },
            required: ["task_id", "title", "reason"],
          },
        },
        load: {
          type: "object",
          description: "Diagnóstico de carga do dia.",
          properties: {
            level: { type: "string", enum: ["leve", "ideal", "pesado", "sobrecarregado"] },
            advice: { type: "string", description: "1 frase de recomendação." },
          },
          required: ["level", "advice"],
        },
      },
      required: ["main_priority", "top_three", "do_not_do", "load"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const body = (await req.json()) as Payload;
    const { date, scope, tasks = [], goals = [], events = [] } = body;

    // Compactar contexto para o modelo
    const ctx = {
      hoje: date,
      escopo: scope,
      eventos_hoje: events.map((e) => ({
        t: e.title,
        h: e.start_time?.slice(0, 5) ?? null,
        fim: e.end_time?.slice(0, 5) ?? null,
        s: e.scope,
      })),
      tarefas: tasks.map((t) => ({
        id: t.id,
        titulo: t.title,
        prazo: t.due_date,
        prioridade: t.priority,
        status: t.status,
        escopo: t.scope,
        meta: t.goal_id ?? null,
        atrasada: t.due_date ? t.due_date < date && t.status !== "concluida" : false,
        para_hoje: t.due_date === date,
      })),
      metas: goals.map((g) => ({
        id: g.id,
        nome: g.name,
        escopo: g.scope,
        prazo: g.deadline,
        progresso_pct: g.pct ?? null,
        ritmo: g.pace ?? null,
      })),
    };

    const systemPrompt = `Você é um coach de produtividade objetivo. Analise os dados do usuário e defina:
1. UMA prioridade principal (alto impacto + urgência)
2. TOP 3 tarefas (incluindo a principal) — selecione APENAS dos IDs do contexto
3. "Não fazer hoje" — máximo 3 tarefas para adiar/ignorar (ruído, baixo impacto, ou sobrecarga)
4. Diagnóstico de carga (leve/ideal/pesado/sobrecarregado) com 1 conselho

Critérios:
- Tarefas atrasadas e com prazo hoje têm prioridade
- Tarefas vinculadas a metas com baixo progresso ou ritmo "atrasada" têm peso extra
- Considere agenda: se há muitos eventos, reduza tarefas
- Use APENAS task_ids reais do contexto. Não invente.
- Seja direto. Frases curtas (5–15 palavras).
- Idioma: português brasileiro.`;

    const userMsg = `Data: ${date}. Escopo ativo: ${scope}.\n\nContexto JSON:\n${JSON.stringify(ctx, null, 2)}`;

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
        tools: [FOCUS_TOOL],
        tool_choice: { type: "function", function: { name: "set_daily_focus" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "Falha na IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("Resposta da IA sem tool_call:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "IA não retornou plano estruturado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const focus = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ focus, generated_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-focus error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
