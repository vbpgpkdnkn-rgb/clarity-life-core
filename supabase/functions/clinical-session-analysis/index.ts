// Edge function: análise clínica de sessões via Lovable AI Gateway
// Recebe { mode: "single" | "comparative", depth: "rapido"|"estrategico"|"profundo", transcript: string, patient_name?: string }
// Retorna { result: { sections: [{ key, title, bullets: string[] }] } }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SINGLE_SECTIONS = [
  { key: "resumo", title: "Resumo da sessão" },
  { key: "questoes", title: "Principais questões do paciente" },
  { key: "atencao", title: "Pontos de atenção" },
  { key: "oportunidades", title: "Oportunidades terapêuticas" },
  { key: "proxima", title: "Direcionamento para próxima sessão" },
  { key: "evolucao", title: "Evolução percebida" },
];

const COMPARATIVE_SECTIONS = [
  { key: "padroes", title: "Padrões repetidos" },
  { key: "evolucao", title: "Evolução do paciente" },
  { key: "temas", title: "Temas centrais" },
  { key: "criticos", title: "Pontos críticos" },
  { key: "direcionamento", title: "Direcionamento estratégico" },
];

function buildSystemPrompt(mode: "single" | "comparative", depth: string) {
  const depthInstr =
    depth === "rapido"
      ? "Seja extremamente conciso. 2-3 bullets curtos por seção. Direto ao ponto."
      : depth === "profundo"
      ? "Seja detalhado e nuançado. 4-6 bullets por seção, com observações ricas, mas ainda em frases curtas."
      : "Equilibre profundidade e clareza. 3-5 bullets por seção.";

  return `Você é um assistente clínico estratégico para psicoterapeutas. Sua função é apoiar a atuação clínica entre sessões — NÃO faz diagnóstico, NÃO emite laudo, NÃO substitui prontuário.

REGRAS ABSOLUTAS:
- Linguagem simples, direta, profissional. Evite jargão clínico técnico.
- NUNCA dê diagnóstico (não use CID, DSM, nomes de transtornos como conclusão).
- NUNCA escreva em formato de prontuário ou registro oficial.
- Foco em CLAREZA, ESTRATÉGIA e AÇÃO para a próxima sessão.
- Cada seção deve ter bullets curtos (1-2 linhas cada). Sem parágrafos longos.
- Se a transcrição estiver vaga ou insuficiente, diga isso explicitamente em vez de inventar.
- ${depthInstr}

Responda SEMPRE chamando a function tool fornecida — nunca em texto livre.`;
}

function buildUserPrompt(
  mode: "single" | "comparative",
  transcript: string,
  patientName?: string,
) {
  if (mode === "single") {
    return `Analise a transcrição abaixo da sessão de psicoterapia${patientName ? ` com a paciente "${patientName}"` : ""} e devolva insights estruturados.

TRANSCRIÇÃO:
"""
${transcript}
"""`;
  }
  return `Abaixo estão MÚLTIPLAS transcrições de sessões${patientName ? ` da paciente "${patientName}"` : ""}, separadas por data ou título. Faça uma análise COMPARATIVA olhando para o conjunto.

TRANSCRIÇÕES:
"""
${transcript}
"""`;
}

function buildTool(mode: "single" | "comparative") {
  const sections = mode === "single" ? SINGLE_SECTIONS : COMPARATIVE_SECTIONS;
  return {
    type: "function",
    function: {
      name: "deliver_clinical_analysis",
      description:
        "Entrega a análise clínica estruturada em seções com bullets curtos.",
      parameters: {
        type: "object",
        properties: {
          sections: {
            type: "array",
            description: "Seções da análise, na ordem especificada.",
            items: {
              type: "object",
              properties: {
                key: {
                  type: "string",
                  enum: sections.map((s) => s.key),
                  description: "Identificador da seção.",
                },
                title: { type: "string" },
                bullets: {
                  type: "array",
                  items: { type: "string" },
                  description: "Bullets curtos, 1-2 linhas cada.",
                },
              },
              required: ["key", "title", "bullets"],
              additionalProperties: false,
            },
          },
        },
        required: ["sections"],
        additionalProperties: false,
      },
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const body = await req.json();
    const mode: "single" | "comparative" = body.mode === "comparative" ? "comparative" : "single";
    const depth: string = ["rapido", "estrategico", "profundo"].includes(body.depth)
      ? body.depth
      : "estrategico";
    const transcript: string = (body.transcript || "").toString().trim();
    const patientName: string | undefined = body.patient_name;

    if (!transcript || transcript.length < 30) {
      return new Response(
        JSON.stringify({ error: "Transcrição muito curta. Cole mais conteúdo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tool = buildTool(mode);
    const payload = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: buildSystemPrompt(mode, depth) },
        { role: "user", content: buildUserPrompt(mode, transcript, patientName) },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "deliver_clinical_analysis" } },
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI gateway error", aiRes.status, text);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos em Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro na IA: " + text.slice(0, 200) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiRes.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call returned", JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "A IA não retornou análise estruturada. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(
        JSON.stringify({ error: "Resposta da IA inválida. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Garante ordem das seções e títulos canônicos
    const canonical = mode === "single" ? SINGLE_SECTIONS : COMPARATIVE_SECTIONS;
    const byKey = new Map<string, any>(
      (parsed.sections || []).map((s: any) => [s.key, s]),
    );
    const ordered = canonical.map((c) => {
      const found = byKey.get(c.key);
      return {
        key: c.key,
        title: c.title,
        bullets: Array.isArray(found?.bullets) ? found.bullets.filter(Boolean) : [],
      };
    });

    return new Response(
      JSON.stringify({ result: { sections: ordered } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("clinical-session-analysis error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
