// quick-decision: chamada rápida do botão "O que devo fazer agora?".
// Versão enriquecida: prioridade, sequência, pontos cegos, decisão crítica.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const QUICK_TOOL = {
  type: "function",
  function: {
    name: "set_quick_decision",
    description: "Decisão imediata estruturada como um chefe sênior de execução.",
    parameters: {
      type: "object",
      properties: {
        priority: { type: "string", description: "1 prioridade clara para AGORA. Imperativa." },
        immediate_action: { type: "string", description: "1 ação executável nos próximos 30 minutos." },
        sequence: {
          type: "array",
          description: "Próximas 3 ações em ordem após a imediata. Cada uma curta e imperativa.",
          items: { type: "string" },
          minItems: 2,
          maxItems: 4,
        },
        mistake_to_fix: { type: "string", description: "1 erro/desvio atual a corrigir. Nomeie o fato." },
        blind_spot: { type: "string", description: "1 ponto cego que você está ignorando — o que não está vendo." },
        critical_decision: { type: "string", description: "Uma decisão difícil que precisa ser tomada hoje (cortar, parar, escolher entre A ou B)." },
        boss_question: { type: "string", description: "Pergunta provocativa estilo chefe para você responder mentalmente antes de agir." },
      },
      required: [
        "priority",
        "immediate_action",
        "sequence",
        "mistake_to_fix",
        "blind_spot",
        "critical_decision",
        "boss_question",
      ],
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
        e: t.scope,
      })),
      metas_criticas: (body.goals ?? []).filter(
        (g: any) => g.pace === "atrasada" || (g.pct ?? 100) < 30,
      ),
      saldo: body.balance ?? null,
      proximo_evento: body.next_event ?? null,
    };

    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), 25000);
    let aiResp: Response;
    try {
      aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: ac.signal,
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                `Você é o CHEFE SÊNIOR DE EXECUÇÃO. Não é coach, não é assistente. Direciona, cobra, decide, expõe pontos cegos.

TOM: imperativo, direto, factual. Frases curtas (6-20 palavras). Português do Brasil.
PROIBIDO: "você pode", "tente", "considere", "que tal", "talvez", motivação genérica, frases vazias.
OBRIGATÓRIO: verbos no imperativo ("Conclua", "Pare", "Execute", "Corte", "Decida"), nomeie o fato antes da ordem, separe pessoal de profissional quando relevante.

CAMPOS:
- priority: a tarefa/foco que DEVE ser feito agora. Específica.
- immediate_action: ação concreta executável em 30min. Sem ambiguidade.
- sequence: as 3 próximas ações em ordem após a imediata. Cada uma uma frase curta. Use a lógica de dependência.
- mistake_to_fix: nomeie o erro/desvio atual concretamente. Ex: "Adiou tarefa X por 4 dias. Pare de empurrar."
- blind_spot: o que o usuário não está vendo. Olhe gaps entre metas atrasadas, tarefas órfãs, sobrecarga não declarada, dependências invisíveis.
- critical_decision: a decisão difícil de hoje. Algo do tipo "Cortar projeto Y", "Parar de aceitar reuniões antes das 11h", "Definir se mantém meta Z ou abandona".
- boss_question: pergunta provocativa que o usuário precisa se fazer ANTES de agir. Ex: "Por que essa tarefa ainda existe na sua lista?", "O que muda no resultado final se você não fizer isso hoje?".

Use TODO o contexto (tarefas, metas, saldo) para decidir. NUNCA dê resposta vaga ou motivacional.`,
            },
            { role: "user", content: JSON.stringify(ctx) },
          ],
          tools: [QUICK_TOOL],
          tool_choice: { type: "function", function: { name: "set_quick_decision" } },
        }),
      });
    } finally {
      clearTimeout(timeoutId);
    }

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
    const isAbort = e instanceof Error && (e.name === "AbortError" || e.message.includes("aborted"));
    return new Response(
      JSON.stringify({
        error: isAbort ? "IA demorou demais. Tente novamente." : e instanceof Error ? e.message : "Erro",
      }),
      { status: isAbort ? 504 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
