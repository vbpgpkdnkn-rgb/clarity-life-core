// annual-monthly-review: gera resumo, principal acerto, principal erro
// e recomendação para o próximo mês. Persiste em ai_insights (kind='monthly_review').
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL = {
  type: "function",
  function: {
    name: "set_monthly_review",
    description: "Revisão factual de um mês.",
    parameters: {
      type: "object",
      properties: {
        resumo: {
          type: "string",
          description:
            "1 frase factual com números. Ex: 'Execução de 67% em 22 dias ativos, lucro de R$ 4.200.'",
        },
        acerto: {
          type: "string",
          description: "Principal acerto do mês. 1 frase imperativa, factual.",
        },
        erro: {
          type: "string",
          description: "Principal erro do mês. 1 frase imperativa, factual.",
        },
        recomendacao: {
          type: "string",
          description:
            "Ordem para o próximo mês. Imperativo. Ex: 'Reduza carga para 3 tarefas/dia e trave a meta X.'",
        },
      },
      required: ["resumo", "acerto", "erro", "recomendacao"],
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
    const { scope = "todos", year, month, label, execution, financial, goals, alerts } =
      await req.json();

    if (!year || !month) {
      return new Response(JSON.stringify({ error: "year e month obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é o CHEFE DE EXECUÇÃO. Lê dados consolidados de um mês e dá veredito.

REGRAS:
- Tom imperativo, factual. Sempre cite NÚMEROS quando disponíveis.
- PROIBIDO: "tente", "talvez", "considere", elogios vagos, motivação genérica.
- Idioma: português do Brasil.
- 'acerto' e 'erro' devem ser específicos e factuais (não "boa consistência" — diga "manteve 70% de execução por 22 dias").
- 'recomendacao' deve ser uma ordem clara para o próximo mês com ação mensurável.
- Se mês tem dados zerados, diga isso e ordene o que medir/registrar.`;

    const userMsg = `Mês: ${label}/${year} | Escopo: ${scope}

EXECUÇÃO:
- Tarefas planejadas: ${execution?.planned ?? 0}
- Concluídas: ${execution?.done ?? 0} (${execution?.rate ?? 0}%)
- Dias produtivos: ${execution?.productive_days ?? 0}
- Dias improdutivos: ${execution?.unproductive_days ?? 0}
- Dias ativos: ${execution?.active_days ?? 0}

FINANCEIRO (R$):
- Receita: ${financial?.receita ?? 0} (pessoal ${financial?.receita_pessoal ?? 0} / prof ${financial?.receita_profissional ?? 0})
- Despesa: ${financial?.despesa ?? 0} (pessoal ${financial?.despesa_pessoal ?? 0} / prof ${financial?.despesa_profissional ?? 0})
- Lucro: ${financial?.lucro ?? 0}

METAS:
- Total no período: ${goals?.total ?? 0}
- Ativas: ${goals?.ativas ?? 0}
- Concluídas: ${goals?.concluidas ?? 0}
- Atrasadas: ${goals?.atrasadas ?? 0}
- Progresso médio: ${goals?.progresso_medio ?? 0}%

ALERTAS DISPARADOS:
${(alerts ?? []).map((a: any) => `- [${a.level}] ${a.title}`).join("\n") || "- nenhum"}

Gere a revisão.`;

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
        tool_choice: { type: "function", function: { name: "set_monthly_review" } },
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

    await supa.from("ai_insights").insert({
      scope,
      kind: "monthly_review",
      payload: {
        year,
        month,
        label,
        ...result,
      },
    });

    return new Response(
      JSON.stringify({ ...result, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("annual-monthly-review error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
