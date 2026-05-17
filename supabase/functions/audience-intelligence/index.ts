const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a inteligência editorial de uma psicóloga clínica especializada em relacionamentos (IBCT + Gottman).

Você cruza TRÊS entradas: (1) o que a referência disse, (2) o que a audiência sentiu nos comentários, (3) o que a PSICÓLOGA pensa sobre o tema. O ponto de vista dela é o ingrediente decisivo — sem ele o conteúdo vira commodity.

Para cada uma das 10 a 15 ideias, traga:
- TÍTULO direto (sem clickbait)
- ÂNGULO ADOTADO: rótulo curto explicando de onde a ideia parte (ex: "A partir dos comentários", "Discordância clínica", "Aprofundamento IBCT", "Visão pessoal da psicóloga", "Inversão de expectativa")
- WHY ANGLE: por que esse ângulo faz sentido para o nicho e para a voz dela (1-2 frases, conectando comentários + perspectiva pessoal quando houver)
- GANCHO: primeira frase como ela abriria o conteúdo, no tom dela
- ANCORAGEM clínica (IBCT/Gottman/IBCT+Gottman)
- FORMATO (reel/carrossel/legenda) com justificativa de 1 linha
- AUDIENCE EVIDENCE: comentário/padrão/dor real que originou a ideia

REGRA CRÍTICA: se a psicóloga discordou de algo na perspectiva dela, ao menos 3 ideias devem partir dessa discordância. Se ela trouxe uma observação clínica específica, transforme isso em pelo menos 2 ideias. Nunca produza ideias neutras descritivas — sempre carregue o ponto de vista dela.

Tom: especialista clínica, direta, humana. Público: mulheres 25–45 em relacionamentos.`;

const TOOL = {
  type: "function",
  function: {
    name: "build_audience_ideas",
    description: "Cruza referência + audiência + perspectiva pessoal e gera 10-15 ideias editoriais.",
    parameters: {
      type: "object",
      properties: {
        patterns: {
          type: "array",
          items: { type: "string" },
          description: "Padrões reais nos comentários: dúvidas, dores, pedidos, frases recorrentes.",
        },
        ideas: {
          type: "array",
          minItems: 10,
          maxItems: 15,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              angle_adopted: { type: "string", description: "Rótulo curto do ângulo (ex: 'A partir dos comentários', 'Discordância clínica', 'Aprofundamento IBCT', 'Visão pessoal')." },
              why_angle: { type: "string", description: "Por que esse ângulo faz sentido — conecta perspectiva pessoal e dor da audiência." },
              hook: { type: "string" },
              clinical_anchor: { type: "string", enum: ["IBCT", "Gottman", "IBCT+Gottman"] },
              format: { type: "string", enum: ["reel", "carrossel", "legenda"] },
              format_rationale: { type: "string" },
              audience_evidence: { type: "string" },
            },
            required: ["title", "angle_adopted", "why_angle", "hook", "clinical_anchor", "format", "format_rationale", "audience_evidence"],
            additionalProperties: false,
          },
        },
      },
      required: ["patterns", "ideas"],
      additionalProperties: false,
    },
  },
};

const ANGLE_INSTRUCTIONS: Record<string, string> = {
  aprofundar: "Aprofundar com a visão clínica IBCT/Gottman dela, partindo da perspectiva pessoal.",
  discordar: "Apresentar a discordância da psicóloga em relação ao vídeo de referência. Ao menos metade das ideias devem confrontar o que foi dito.",
  diferente: "Usar o tema com ângulo completamente diferente do que a referência fez — partir de outro lugar.",
  audiencia: "Partir dos comentários da audiência como problema central. Cada ideia deve referenciar uma dor explícita.",
  livre: "Deixar a IA identificar o melhor ângulo para cada ideia individualmente — varie entre os ângulos.",
  // legados
  adaptar: "Adaptar para o nicho de relacionamentos partindo da perspectiva pessoal.",
  oposto: "Explorar o ângulo oposto ao da referência.",
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
    const myPerspective = String(body.my_perspective ?? "").trim();
    const angle = String(body.angle ?? "aprofundar");

    if (transcript.length < 20 || comments.length < 20) {
      return new Response(JSON.stringify({ error: "Cole transcrição e comentários (mín. 20 caracteres cada)." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurado");

    const userMsg = `AUTOR/PERFIL DA REFERÊNCIA: ${body.author || "não informado"}
DIREÇÃO ESCOLHIDA: ${ANGLE_INSTRUCTIONS[angle] ?? ANGLE_INSTRUCTIONS.aprofundar}

═══ TRANSCRIÇÃO DO VÍDEO DE REFERÊNCIA ═══
${transcript}

═══ COMENTÁRIOS DA AUDIÊNCIA ═══
${comments}

═══ O QUE A PSICÓLOGA PENSA SOBRE ESSE TEMA (perspectiva clínica e pessoal) ═══
${myPerspective || "(não informada — gere ideias mesmo assim, mas marque que falta perspectiva pessoal)"}

Cruze os três blocos. As ideias precisam soar como ELA — não como uma descrição neutra do tema. Gere entre 10 e 15 ideias.`;

    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-pro",
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
