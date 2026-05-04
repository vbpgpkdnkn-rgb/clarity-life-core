// Linha editorial semanal — gera 7 dias de sugestões de tipo de conteúdo
// Pilares: Padrão relacional / Função emocional / Transformação / Qualidade relacional
// Objetivos: identificacao / autoridade / atrair_paciente / ensinar

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a IA editorial de uma psicóloga clínica especializada em relacionamentos.
Distribua os 7 dias da semana entre os pilares (padrao_relacional, funcao_emocional, transformacao, qualidade_relacional) e objetivos (identificacao, autoridade, atrair_paciente, ensinar).
Regras:
- Nunca dois conteúdos com o mesmo objetivo em dias seguidos.
- Reels e Carrosséis se alternam ao longo da semana.
- Stories aparecem nos dias entre Reels (terça e quinta tradicionalmente, mas pode variar).
- Domingo é descanso ou repost estratégico.
- Sábado, evergreen.
- Cada dia recebe um título curto orientador (não um roteiro), o pilar, o objetivo e o formato.`;

const TOOL = {
  type: "function",
  function: {
    name: "build_editorial_line",
    description: "Gera plano editorial dos 7 dias da semana.",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "array",
          minItems: 7,
          maxItems: 7,
          items: {
            type: "object",
            properties: {
              weekday: { type: "string", enum: ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"] },
              pillar: { type: "string", enum: ["padrao_relacional", "funcao_emocional", "transformacao", "qualidade_relacional", "descanso"] },
              objective: { type: "string", enum: ["identificacao", "autoridade", "atrair_paciente", "ensinar", "descanso"] },
              format: { type: "string", enum: ["reel", "carrossel", "stories", "legenda", "repost", "descanso"] },
              suggestion: { type: "string", description: "Título orientador curto (5-10 palavras)" },
            },
            required: ["weekday", "pillar", "objective", "format", "suggestion"],
            additionalProperties: false,
          },
        },
      },
      required: ["days"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supa = (await import("https://esm.sh/@supabase/supabase-js@2.45.0")).createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u, error: e } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (e || !u?.user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const focus: string = body.focus ?? "";
    const recentTitles: string[] = body.recent_titles ?? [];

    const userMsg = `Gere a linha editorial dos 7 dias.
${focus ? `FOCO DA SEMANA: ${focus}` : ""}
${recentTitles.length ? `Conteúdos publicados recentemente (evite repetir tema):\n- ${recentTitles.join("\n- ")}` : ""}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userMsg }],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "build_editorial_line" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Limite atingido" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Falha na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiResp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("IA não retornou estrutura");
    return new Response(args, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("editorial-line-generator error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
