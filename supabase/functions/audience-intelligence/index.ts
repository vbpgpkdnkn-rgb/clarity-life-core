const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a inteligência editorial de uma psicóloga clínica especializada em relacionamentos (IBCT + Gottman). Sua tarefa é analisar a transcrição de um vídeo de referência e os comentários da audiência para identificar o que as pessoas realmente querem entender, o que as tocou, o que gerou dúvida ou identificação. Com base nisso, gere 15 ideias de conteúdo que:

1. Partem da dor ou desejo real identificado nos comentários
2. Traduzem esse tema para a linguagem clínica da psicóloga (IBCT ou Gottman)
3. Têm potencial de gerar identificação, salvamento ou DMs
4. Não repetem o conteúdo de referência — partem dele como gatilho, não como modelo

Para cada ideia, entregue:
- TÍTULO: direto, específico, sem clickbait
- GANCHO: primeira frase do conteúdo — como a psicóloga abriria esse vídeo
- ANCORAGEM: qual mecanismo clínico (IBCT/Gottman) sustenta o conteúdo
- FORMATO: Reel, Carrossel ou Legenda — com justificativa de 1 linha

Tom: especialista clínica, direta, humana, sem autoajuda, sem clichê de IA. Público: mulheres 25–45 anos em relacionamentos que querem melhorar.`;

const TOOL = {
  type: "function",
  function: {
    name: "build_audience_ideas",
    description: "Analisa transcrição e comentários e gera exatamente 15 ideias editoriais clínicas.",
    parameters: {
      type: "object",
      properties: {
        patterns: {
          type: "array",
          items: { type: "string" },
          description: "Padrões reais encontrados nos comentários: dúvidas, dores, pedidos, frases recorrentes.",
        },
        ideas: {
          type: "array",
          minItems: 15,
          maxItems: 15,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              hook: { type: "string" },
              clinical_anchor: { type: "string", enum: ["IBCT", "Gottman", "IBCT+Gottman"] },
              format: { type: "string", enum: ["reel", "carrossel", "legenda"] },
              format_rationale: { type: "string" },
              audience_evidence: { type: "string", description: "Comentário/padrão da audiência que originou a ideia." },
            },
            required: ["title", "hook", "clinical_anchor", "format", "format_rationale", "audience_evidence"],
            additionalProperties: false,
          },
        },
      },
      required: ["patterns", "ideas"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const supa = (await import("https://esm.sh/@supabase/supabase-js@2.45.0")).createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u, error: e } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (e || !u?.user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const transcript = String(body.transcript ?? "").trim();
    const comments = String(body.comments ?? "").trim();
    if (transcript.length < 20 || comments.length < 20) {
      return new Response(JSON.stringify({ error: "Cole a transcrição e comentários suficientes para análise." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const angleMap: Record<string, string> = {
      adaptar: "Adaptar para o nicho de relacionamentos",
      oposto: "Explorar o ângulo oposto",
      aprofundar: "Aprofundar com IBCT/Gottman",
      livre: "Usar como ponto de partida livre",
    };

    const userMsg = `AUTOR/PERFIL: ${body.author || "não informado"}\nÂNGULO DESEJADO: ${angleMap[body.angle] ?? angleMap.adaptar}\n\nTRANSCRIÇÃO DO VÍDEO:\n${transcript}\n\nCOMENTÁRIOS DA AUDIÊNCIA:\n${comments}\n\nAnalise primeiro os comentários. Gere exatamente 15 ideias, cada uma conectada a uma dor, dúvida, reclamação, identificação ou pedido real da audiência.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "build_audience_ideas" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Créditos da IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI error", aiResp.status, await aiResp.text());
      return new Response(JSON.stringify({ error: "Falha na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiResp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("IA não retornou estrutura");
    const parsed = JSON.parse(args);
    return new Response(JSON.stringify({ patterns: parsed.patterns ?? [], ideas: (parsed.ideas ?? []).slice(0, 15) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("audience-intelligence error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
