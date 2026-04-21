// quick-decision: chamada rápida do botão "O que devo fazer agora?".
// Retorna 3 itens curtos: prioridade, erro a corrigir, ação imediata.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const QUICK_TOOL = {
  type: "function",
  function: {
    name: "set_quick_decision",
    description: "Decisão imediata em 3 pontos.",
    parameters: {
      type: "object",
      properties: {
        priority: { type: "string", description: "1 prioridade clara para AGORA." },
        mistake_to_fix: { type: "string", description: "1 erro/desvio a corrigir já." },
        immediate_action: { type: "string", description: "1 ação concreta para fazer nos próximos 30min." },
      },
      required: ["priority", "mistake_to_fix", "immediate_action"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");
    const body = await req.json();

    const ctx = {
      hora: new Date().toISOString(),
      escopo: body.scope,
      tarefas_ativas: (body.tasks ?? []).slice(0, 30).map((t: any) => ({
        id: t.id,
        t: t.title,
        prazo: t.due_date,
        p: t.priority,
        s: t.status,
      })),
      metas_criticas: (body.goals ?? []).filter((g: any) => g.pace === "atrasada" || (g.pct ?? 100) < 30),
      saldo: body.balance ?? null,
      proximo_evento: body.next_event ?? null,
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              `Você é o CHEFE DE EXECUÇÃO. Não é coach, não é assistente. Direciona, cobra, decide.

TOM: imperativo, direto, factual. Frases de 6–18 palavras. Português do Brasil.
PROIBIDO: "você pode", "tente", "considere", "que tal", "talvez", motivação genérica.
OBRIGATÓRIO: verbos no imperativo ("Conclua", "Pare", "Execute", "Corte"), nomear o fato antes da ordem.

CAMPOS:
- priority: a tarefa/foco que DEVE ser feito agora. Específica. Ex: "Conclua a proposta do cliente X antes de qualquer outra coisa."
- mistake_to_fix: o erro/desvio atual nomeado. Ex: "Você adiou a tarefa Y por 3 dias. Pare de empurrar."
- immediate_action: ação concreta executável em 30min. Ex: "Abra o documento agora e escreva os 3 primeiros parágrafos."

Use o contexto (tarefas, metas, saldo) para decidir. NUNCA dê resposta vaga.`,
          },
          { role: "user", content: JSON.stringify(ctx) },
        ],
        tools: [QUICK_TOOL],
        tool_choice: { type: "function", function: { name: "set_quick_decision" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      if (aiResp.status === 429)
        return new Response(JSON.stringify({ error: "Limite atingido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (aiResp.status === 402)
        return new Response(JSON.stringify({ error: "Créditos esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      return new Response(JSON.stringify({ error: "Falha IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Sem resposta estruturada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const decision = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ decision }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quick-decision error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
