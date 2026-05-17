// Relational Content Engine v2
// Voz clínica autoral · IBCT + Gottman · zero clichê
// Modos: 'topics' (tema+guia), 'single' (roteiro autoral livre), 'variations' (3 ângulos), 'series' (5 conteúdos conectados)

import { aiFetch } from "../_shared/anthropic.ts";
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
          maxItems: 3,
          description: "Exatamente 3 tópicos: ENTRADA, VIRADA, MECANISMO. Cada um avança o anterior — não funcionam isolados.",
          items: {
            type: "object",
            properties: {
              theme: { type: "string", description: "Nome do bloco prefixado pela função: 'A entrada — ...', 'A virada — ...', 'O mecanismo — ...'." },
              question: { type: "string", description: "Pergunta específica ao raciocínio dela — não ao tema. Que ela responde com história/observação clínica/exemplo concreto, não com teoria. Nunca vazio." },
              context: { type: "string", description: "Recorte específico do que ela escreveu no campo 'O que pensa' que sustenta este tópico. Cite ou parafraseie um trecho real." },
              clinical_anchor: { type: "string", description: "Conceito IBCT/Gottman traduzido em comportamento cotidiano reconhecível. Nunca jargão solto." },
              guidance: { type: "string", description: "Parágrafo curto guiando a linha de fala — o que precisa ser dito aqui para AVANÇAR o raciocínio do tópico anterior." },
              connects_to_next: { type: "string", description: "1 frase de PRODUÇÃO (não falada): como esse tópico abre o próximo. No último tópico, descrever como abre o fechamento." },
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

const TOPICS_SYSTEM_PROMPT = `Você é uma IA de criação de conteúdo para uma psicóloga clínica especializada em relacionamentos e terapia de casal (IBCT + Gottman).

PRINCÍPIO FUNDAMENTAL:
Você não gera uma lista de pontos sobre um tema. Você constrói uma LINHA DE RACIOCÍNIO PROGRESSIVA onde cada tópico avança o anterior. O conteúdo tem direção — começa num problema reconhecível e termina numa perspectiva que a pessoa não tinha antes de assistir.

SOBRE O CAMPO "O QUE VOCÊ PENSA":
É o coração. Cada tópico parte de algo específico que a psicóloga escreveu aqui. Frase, observação clínica, discordância, padrão que ela viu — entra no tópico correspondente como o raciocínio que sustenta a pergunta. Nunca substitua o pensamento dela por conceitos padrão do nicho.

REGRAS DE PROGRESSÃO (rígidas):
- TÓPICO 1 — A ENTRADA: estabelece o problema real (não o sintoma, o padrão por baixo). O que está acontecendo que a pessoa reconhece na própria vida.
- TÓPICO 2 — A VIRADA: desloca a perspectiva. O que parece ser o problema NÃO é. Este tópico CONTRADIZ ou COMPLEXIFICA o Tópico 1.
- TÓPICO 3 — O MECANISMO: explica como funciona por dentro. Lógica clínica em comportamento cotidiano. Usa diretamente o que ela escreveu no campo "O que pensa".
- FECHAMENTO — A ATERRISSAGEM: não é conclusão. É onde o raciocínio deixa a pessoa. Frase que ela vai querer salvar ou mandar para alguém.
- Cada tópico PRECISA do anterior para fazer sentido. Tópicos que funcionam isolados estão ERRADOS.

SOBRE AS PERGUNTAS:
Específica ao raciocínio dela — nunca ao tema em abstrato.
ERRADO: "Por que a comunicação é importante no conflito?"
CERTO: "O que acontece no momento em que você para de defender sua posição e pergunta o que o outro está tentando te dizer?"
A pergunta é respondida com história, observação clínica ou exemplo concreto — não com teoria.

SOBRE A ÂNCORA CLÍNICA:
Nunca jargão solto. Nunca "a IBCT trabalha com X".
Sempre conceito traduzido em comportamento reconhecível.
Ex: "Isso é o que Gottman chama de tentativa de reparação — uma ação pequena que impede a escalada antes que os dois percam acesso um ao outro."

SOBRE O GANCHO:
Parte do ponto de vista específico dela — não do tema. Se ela acha que a maioria está olhando para o lugar errado, o gancho parte disso. Se ela discorda de algo, o gancho parte da discordância. Nunca abertura motivacional. Nunca "você sabia que".

SOBRE O FECHAMENTO:
Não conclusão. Frase que a pessoa vai querer guardar, mandar para o parceiro, voltar para ler. Emerge do raciocínio construído — não sentença genérica sobre relacionamentos saudáveis.

SOBRE connects_to_next:
Nota INTERNA de produção (não falada na câmera). 1 frase descrevendo como esse tópico abre o seguinte. Ex: "Depois de responder isso, o Tópico 2 desloca o que ela acabou de afirmar."

TOM PROIBIDO:
- Perguntas que qualquer psicóloga responderia sobre qualquer tema
- Contextos que descrevem o tema em vez de avançar o raciocínio
- Âncoras como jargão sem tradução
- Fechamentos motivacionais ou genéricos
- Tópicos que fazem sentido fora da sequência

Preencha todos os campos. Nunca strings vazias.

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
        objective: { type: "string" },
        format: { type: "string" },
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
      userMsg = body.prompt || `Construa uma LINHA DE RACIOCÍNIO PROGRESSIVA em 3 tópicos.

TEMA OU IDEIA:
${theme}

O QUE A PSICÓLOGA PENSA SOBRE ESSE TEMA (matéria-prima — cada tópico precisa partir daqui):
${myPerspective}

FORMATO: ${format}
OBJETIVO: ${objective}
ANCORAGEM CLÍNICA: ${anchor}
${audienceBlock}${calibrationBlock}

ESTRUTURA OBRIGATÓRIA — cada tópico AVANÇA o anterior:

GANCHO — interrompe o scroll. Parte do ponto de vista específico dela (não do tema). Frase ou pergunta que vem do que ela escreveu.

TÓPICO 1 — A ENTRADA — estabelece o problema real (o padrão por baixo do sintoma). O que a pessoa reconhece na própria vida.

TÓPICO 2 — A VIRADA — desloca a perspectiva. CONTRADIZ ou COMPLEXIFICA o Tópico 1. "O que parece ser o problema, não é."

TÓPICO 3 — O MECANISMO — como funciona por dentro. Lógica clínica em comportamento cotidiano. Usa diretamente o que ela escreveu no campo "O que pensa".

FECHAMENTO — A ATERRISSAGEM — não conclusão. Frase que a pessoa vai querer salvar ou mandar para o parceiro. Emerge do raciocínio construído.

REGRAS DURAS:
- Cada tópico DEPENDE do anterior. Se um tópico funciona isolado, refaça.
- Pergunta = específica ao raciocínio dela, não ao tema. Respondida com história/observação clínica/exemplo concreto, não com teoria.
- Contexto = recorte real do que ela escreveu (cite/parafraseie).
- Âncora clínica = conceito IBCT/Gottman traduzido em comportamento. Nunca jargão.
- connects_to_next = nota INTERNA de produção: 1 frase descrevendo como esse tópico abre o seguinte (no Tópico 3, como abre o fechamento).
- narrative_arc = 1 frase: de onde parte e onde aterrissa.
- Nenhum campo vazio. Nenhuma string em branco.`;
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

    const aiResp = await aiFetch({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: toolName } },
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
