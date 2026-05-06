// Relational Content Engine v2
// Voz clínica autoral · IBCT + Gottman · zero clichê
// Modos: 'topics' (tema+guia), 'single' (roteiro autoral livre), 'variations' (3 ângulos), 'series' (5 conteúdos conectados)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VOICE_RULES = `VOZ OBRIGATÓRIA:
Especialista que senta na frente de alguém e diz algo que ela nunca ouviu dito assim. Direto, sem rodeios. Tradução real do clínico em comportamento cotidiano. Nunca jargão solto. Nunca conclusão óbvia.

PROIBIDO:
"Isso não é X, é Y" / "Vale ressaltar" / "Você merece" / "Sua jornada" / "Muitas pessoas..." / "Você sabia" / linguagem de coach / motivacional vazio / emoji decorativo / pergunta retórica de abertura.

OBRIGATÓRIO:
- Imagens concretas (a louça, o silêncio no carro, a mensagem sem resposta)
- Frases que nomeiam o que a pessoa sente mas não tinha palavras
- Conceito clínico SEMPRE traduzido em comportamento reconhecível
- Frases curtas. Ritmo de fala, não de texto escrito`;

// ─── TÓPICOS: pergunta real + contexto + âncora clínica ───
const TOPICS_TOOL = {
  type: "function",
  function: {
    name: "build_recording_topics",
    description: "Gera gancho e 3-5 tópicos para gravação com pergunta real, contexto vindo do pensamento da psicóloga e âncora clínica traduzida em comportamento.",
    parameters: {
      type: "object",
      properties: {
        theme: { type: "string" },
        format: { type: "string" },
        objective: { type: "string" },
        anchor: { type: "string" },
        narrative_arc: {
          type: "string",
          description: "1 frase descrevendo o arco da fala — para onde a conversa vai do início ao fim. Garante coesão.",
        },
        hook: {
          type: "object",
          properties: {
            theme: { type: "string", description: "GANCHO" },
            guidance: { type: "string", description: "Frase ou pergunta de abertura específica, vinda diretamente do raciocínio dela. Nunca vazio." },
          },
          required: ["theme", "guidance"],
          additionalProperties: false,
        },
        topics: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              theme: { type: "string", description: "Nome do bloco." },
              question: { type: "string", description: "Pergunta real e específica para ela responder na câmera. Nunca vazio." },
              context: { type: "string", description: "Citação, recorte ou referência específica ao que ela escreveu que sustenta este tópico. Nunca genérico." },
              clinical_anchor: { type: "string", description: "Conceito de IBCT ou Gottman traduzido em comportamento cotidiano. Nunca jargão solto." },
              guidance: { type: "string", description: "Tema + parágrafo curto guiando a linha de fala de modo coeso, conectado e autoral." },
              connects_to_next: { type: "string", description: "1 frase: como esse bloco abre o próximo. Garante o fio." },
            },
            required: ["theme", "question", "context", "clinical_anchor", "guidance", "connects_to_next"],
            additionalProperties: false,
          },
        },
        closing: {
          type: "object",
          properties: {
            theme: { type: "string" },
            guidance: { type: "string", description: "Direção de fechamento: o que ela quer que a pessoa sinta, perceba ou faça depois de assistir. Não frase pronta. Nunca vazio." },
          },
          required: ["theme", "guidance"],
          additionalProperties: false,
        },
      },
      required: ["theme", "format", "objective", "anchor", "narrative_arc", "hook", "topics", "closing"],
      additionalProperties: false,
    },
  },
};

const TOPICS_SYSTEM_PROMPT = `Você é uma IA de criação de conteúdo para uma psicóloga clínica especializada em relacionamentos e terapia de casal.

Seu trabalho é diferente de gerar conteúdo genérico. Você trabalha por CONEXÃO, não por dedução.

Isso significa:
- Você lê o que a psicóloga escreveu e conecta os pontos do raciocínio dela
- Você não substitui o pensamento dela por conceitos padrão do nicho
- Se o texto vier fragmentado, ditado por voz ou com ideias incompletas, você interpreta a intenção e constrói a partir disso
- O output deve soar como ela — não como uma descrição do tema

O campo "O que você pensa sobre esse tema" é o coração do conteúdo. Cada tópico gerado deve partir de algo específico que ela escreveu nesse campo. Nunca ignore esse campo. Nunca o substitua por generalidades.

Se ela escreveu sobre casamento virando lista de tarefas, os tópicos falam sobre isso — não sobre "comunicação no relacionamento".
Se ela escreveu sobre propósito no casamento, os tópicos falam sobre isso — não sobre "conexão emocional" genérica.
Se ela discordou de algo, o conteúdo reflete a discordância — não suaviza para algo neutro.

Preencha todos os campos estruturados. Nunca deixe strings vazias. Contexto e âncora clínica devem ser específicos.

${VOICE_RULES}`;

// ─── ROTEIRO AUTORAL: texto corrido livre, voz natural ───
const SCRIPT_TOOL = {
  type: "function",
  function: {
    name: "build_authored_script",
    description: "Gera roteiro autoral em texto corrido com voz de fala natural. Editável por parágrafo.",
    parameters: {
      type: "object",
      properties: {
        theme: { type: "string" },
        objective: { type: "string", enum: ["atrair_paciente", "autoridade", "identificacao", "ensinar"] },
        format: { type: "string", enum: ["reel", "carrossel", "legenda"] },
        anchor: { type: "string" },
        paragraphs: {
          type: "array",
          minItems: 4,
          maxItems: 8,
          description: "Parágrafos curtos, em voz de fala. Cada um é uma unidade de pensamento que pode ser regenerada isoladamente.",
          items: {
            type: "object",
            properties: {
              role: { type: "string", description: "Função do parágrafo: gancho, virada, mecanismo, consequência, deslocamento, aterrissagem." },
              text: { type: "string", description: "Texto autoral em voz de fala natural. Frases curtas. Sem clichê." },
            },
            required: ["role", "text"],
            additionalProperties: false,
          },
        },
      },
      required: ["theme", "objective", "format", "anchor", "paragraphs"],
      additionalProperties: false,
    },
  },
};

const SCRIPT_SYSTEM_PROMPT = `Você é IA de conteúdo de uma psicóloga clínica (IBCT + Gottman).

GERA ROTEIRO AUTORAL: texto corrido em VOZ DE FALA — não voz de texto escrito. Como ela falaria pra uma amiga inteligente. Frases curtas. Pausas naturais. Pensamento que se desenvolve.

ESTRUTURA INVISÍVEL (não rotular como títulos no texto): gancho → virada → mecanismo → consequência → deslocamento → aterrissagem. Distribua em 4-8 parágrafos.

CADA PARÁGRAFO: uma unidade de pensamento independente. Pode ser regenerado sozinho. Conecta ao anterior por sentido, não por "além disso".

${VOICE_RULES}`;

// ─── VARIAÇÕES: 3 ângulos diferentes do mesmo tema ───
const VARIATIONS_TOOL = {
  type: "function",
  function: {
    name: "build_angle_variations",
    description: "Gera 3 ângulos radicalmente diferentes de abordar o MESMO tema. Para escolher o ângulo certo antes de gravar.",
    parameters: {
      type: "object",
      properties: {
        theme: { type: "string" },
        variations: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              angle_name: { type: "string", description: "Nome do ângulo (ex: 'pela cena cotidiana', 'pelo mecanismo invisível', 'pela consequência futura')." },
              one_liner: { type: "string", description: "1 frase capturando a essência desse ângulo." },
              opening_idea: { type: "string", description: "2-3 frases descrevendo COMO abrir nesse ângulo. Direção, não fala pronta." },
              why_this_works: { type: "string", description: "1 frase clínica: por que esse ângulo funciona para esse tema." },
            },
            required: ["angle_name", "one_liner", "opening_idea", "why_this_works"],
            additionalProperties: false,
          },
        },
      },
      required: ["theme", "variations"],
      additionalProperties: false,
    },
  },
};

const VARIATIONS_SYSTEM_PROMPT = `Você é IA estratégica de conteúdo clínico (IBCT + Gottman).

Gera 3 ângulos DIFERENTES de atacar o mesmo tema. Cada ângulo é uma porta de entrada distinta — não variação de palavras, variação de ESTRATÉGIA narrativa.

Os 3 ângulos sempre cobrem entradas distintas: cena cotidiana / mecanismo invisível / consequência futura / nomeação precisa / inversão de expectativa. Escolha as 3 mais potentes pro tema.

${VOICE_RULES}`;

// ─── SÉRIE: 5 conteúdos conectados ───
const SERIES_TOOL = {
  type: "function",
  function: {
    name: "build_connected_series",
    description: "Gera uma série de conteúdos conectados — narrativa que se desenvolve. Não posts soltos.",
    parameters: {
      type: "object",
      properties: {
        series_name: { type: "string" },
        narrative_arc: { type: "string", description: "Arco da série em 1 frase: do que parte, para onde chega." },
        pieces: {
          type: "array",
          minItems: 3,
          maxItems: 7,
          items: {
            type: "object",
            properties: {
              order: { type: "integer" },
              theme: { type: "string", description: "Tema do post (2-5 palavras)." },
              format: { type: "string", enum: ["reel", "carrossel", "legenda"] },
              one_liner: { type: "string", description: "Essência do post em 1 frase." },
              guidance: { type: "string", description: "2-3 frases sobre o que precisa ser dito. Direção autoral." },
              builds_on_previous: { type: "string", description: "1 frase: como esse post conecta ao anterior." },
            },
            required: ["order", "theme", "format", "one_liner", "guidance", "builds_on_previous"],
            additionalProperties: false,
          },
        },
      },
      required: ["series_name", "narrative_arc", "pieces"],
      additionalProperties: false,
    },
  },
};

const SERIES_SYSTEM_PROMPT = `Você é IA estratégica de conteúdo clínico.

Gera uma SÉRIE: posts que se desenvolvem como uma conversa, não posts soltos sobre o mesmo tema. Cada post abre o próximo. Cada post deixa uma pergunta ou tensão que o próximo resolve.

${VOICE_RULES}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const supa = (await import("https://esm.sh/@supabase/supabase-js@2.45.0")).createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u, error: e } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (e || !u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const body = await req.json().catch(() => ({}));
    const mode: "topics" | "single" | "variations" | "series" | "regen_paragraph" = body.mode ?? "topics";

    let tool: any;
    let toolName: string;
    let userMsg: string;
    let systemPrompt: string;

    const theme = body.theme ?? "padrão relacional";
    const myPerspective = body.my_perspective ?? "";
    const objective = body.objective ?? "identificacao";
    const format = body.format ?? "reel";
    const anchor = body.anchor ?? "auto";
    const audienceContext = body.audience_context ?? "";
    const voiceCalibration = body.voice_calibration ?? "";

    const calibrationBlock = voiceCalibration
      ? `\n═══ CALIBRAÇÃO DE VOZ (exemplos da forma como ela fala — espelhe o ritmo, vocabulário e maneirismos) ═══\n${voiceCalibration}\n`
      : "";

    const audienceBlock = audienceContext
      ? `\n═══ CONTEXTO DA AUDIÊNCIA ═══\n${audienceContext}\n`
      : "";

    const perspectiveBlock = myPerspective
      ? `\n═══ O QUE A PSICÓLOGA PENSA SOBRE ESSE TEMA (matéria-prima principal) ═══\n${myPerspective}\n`
      : "";

    if (mode === "topics") {
      tool = TOPICS_TOOL;
      toolName = "build_recording_topics";
      systemPrompt = TOPICS_SYSTEM_PROMPT;
      userMsg = `Gere TEMA + PARÁGRAFO GUIA para gravação. Não perguntas. Não roteiro pronto.

TEMA: ${theme}
FORMATO: ${format}
OBJETIVO: ${objective}
ÂNCORA CLÍNICA: ${anchor === "auto" ? "você decide" : anchor}
${perspectiveBlock}${audienceBlock}${calibrationBlock}
Entregue: arco narrativo (1 frase), gancho (tema+guia), 3 a 5 tópicos (tema + parágrafo guia + conecta-com-próximo), fechamento (tema+guia).`;
    } else if (mode === "single") {
      tool = SCRIPT_TOOL;
      toolName = "build_authored_script";
      systemPrompt = SCRIPT_SYSTEM_PROMPT;
      const avoid: string[] = body.avoid ?? [];
      userMsg = `Gere ROTEIRO AUTORAL em texto corrido — voz de fala natural.

TEMA: ${theme}
OBJETIVO: ${objective}
FORMATO: ${format}
ÂNCORA: ${anchor === "auto" ? "você decide" : anchor}
${perspectiveBlock}${audienceBlock}${calibrationBlock}
${avoid.length ? `EVITE estas aberturas:\n- ${avoid.join("\n- ")}\n` : ""}
4-8 parágrafos curtos. Cada um uma unidade de pensamento. Voz de fala, não de texto.`;
    } else if (mode === "regen_paragraph") {
      tool = {
        type: "function",
        function: {
          name: "regen_paragraph",
          description: "Reescreve UM parágrafo do roteiro mantendo função e voz.",
          parameters: {
            type: "object",
            properties: {
              text: { type: "string" },
            },
            required: ["text"],
            additionalProperties: false,
          },
        },
      };
      toolName = "regen_paragraph";
      systemPrompt = SCRIPT_SYSTEM_PROMPT;
      const role = body.role ?? "parágrafo";
      const original = body.original ?? "";
      const fullContext = body.full_context ?? "";
      const direction = body.direction ?? "torne mais natural e direto";
      userMsg = `Reescreva APENAS este parágrafo (função: ${role}).

CONTEXTO COMPLETO DO ROTEIRO:
${fullContext}

PARÁGRAFO ATUAL:
${original}

DIREÇÃO: ${direction}
${perspectiveBlock}${calibrationBlock}
Mantenha a função (${role}). Mude a forma, mantenha o lugar narrativo.`;
    } else if (mode === "variations") {
      tool = VARIATIONS_TOOL;
      toolName = "build_angle_variations";
      systemPrompt = VARIATIONS_SYSTEM_PROMPT;
      userMsg = `Gere 3 ÂNGULOS diferentes de atacar este tema.

TEMA: ${theme}
${perspectiveBlock}${audienceBlock}
3 entradas radicalmente diferentes. Cada uma com nome, essência, ideia de abertura e razão clínica.`;
    } else if (mode === "series") {
      tool = SERIES_TOOL;
      toolName = "build_connected_series";
      systemPrompt = SERIES_SYSTEM_PROMPT;
      const pieceCount = body.piece_count ?? 5;
      userMsg = `Gere uma SÉRIE de ${pieceCount} conteúdos conectados narrativamente.

TEMA CENTRAL: ${theme}
${perspectiveBlock}${audienceBlock}
Cada post abre o próximo. Não são variações — é uma conversa que se desenvolve.`;
    } else {
      return new Response(JSON.stringify({ error: "Modo inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: toolName } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      if (aiResp.status === 429)
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns minutos." }), {
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
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc?.function?.arguments)
      return new Response(JSON.stringify({ error: "IA não retornou estrutura" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const parsed = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify({ mode, ...parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("relational-content-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
