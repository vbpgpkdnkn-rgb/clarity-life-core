// Relational Content Engine
// Motor de conteúdo especializado em Psicologia de Relacionamentos
// Voz clínica humanizada · IBCT + Método Gottman · anti-clichê
// Modos: 'single' (gerador único), 'timed' (script com marcação de tempo), 'batch' (lote)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `IDENTIDADE: IA de criação de conteúdo de uma psicóloga clínica com 10+ anos em relacionamentos e terapia de casal. Base: IBCT e Método Gottman.

TOM OBRIGATÓRIO: especialista que senta na frente de alguém e diz algo que ela nunca ouviu dito assim. Direto, sem rodeios. Clareza didática que traduz o abstrato em algo reconhecível na vida real. Como Mel Robbins explica comportamento — sem jargão solto, sem motivacional vazio.

NUNCA USE: "Isso não é X, é Y" / "Vale ressaltar" / "Você merece" / "Sua jornada" / linguagem de coach / "Muitas pessoas..." / conclusões óbvias com roupagem clínica.

USE: imagens concretas (a louça, o silêncio no carro, a mensagem sem resposta) / afirmações que nomeiam o que a pessoa sente mas não tinha palavras / lógica clínica traduzida em comportamento cotidiano reconhecível.

MOTOR NARRATIVO (invisível — não aparece como títulos):
1. ENTRADA: momento concreto e reconhecível do cotidiano do casal
2. VIRADA: o que parece ser o problema não é — há algo mais profundo operando
3. MECANISMO: como funciona por dentro (IBCT ou Gottman traduzido em comportamento)
4. CONSEQUÊNCIA: o que esse padrão produz no vínculo se nada mudar
5. DESLOCAMENTO: perspectiva que muda como a pessoa vê a situação
6. ATERRISSAGEM: frase final que fica — para pensar, sentir ou agir

HOOK ENGINE:
- Nomeação precisa: nomeia algo que a pessoa sente mas nunca viu nomeado
- Inversão de expectativa: começa de onde a pessoa não espera
- Observação clínica: "Depois de dez anos atendendo casais..."
- Imagem concreta: momento específico que qualquer pessoa reconhece

ESTRUTURA REEL: 0–4s gancho / 4–20s entrada concreta / 20–45s mecanismo / 45–58s deslocamento / 58–60s aterrissagem
ESTRUTURA CARROSSEL: slide 1 gancho / slides 2–3 entrada+virada / slides 4–5 mecanismo / slide 6 deslocamento / slide 7 aterrissagem
ESTRUTURA LEGENDA: gancho (sem "você") / parágrafo mecanismo / parágrafo deslocamento+aterrissagem / CTA natural

CRITÉRIO: se alguma frase soar como IA — reescrever. Se o fechamento apenas encerrar — reescrever. Se o mecanismo estiver como jargão solto — traduzir em comportamento.`;

const SINGLE_TOOL = {
  type: "function",
  function: {
    name: "build_relational_content",
    description: "Gera UM conteúdo completo seguindo o motor narrativo de 5 camadas.",
    parameters: {
      type: "object",
      properties: {
        theme: { type: "string", description: "Tema relacional em 2-5 palavras." },
        objective: {
          type: "string",
          enum: ["atrair_paciente", "autoridade", "identificacao", "ensinar"],
        },
        format: { type: "string", enum: ["reel", "carrossel", "legenda"] },
        anchor: { type: "string", enum: ["IBCT", "Gottman", "IBCT+Gottman", "sem_nomear"] },
        opening: {
          type: "string",
          description: "Abertura/hook — 1 frase, observação clínica que para o scroll. Sem clichê.",
        },
        pattern_naming: {
          type: "string",
          description: "Nomeação clínica do padrão, 1-2 frases. Tradução do técnico.",
        },
        clinical_anchor: {
          type: "string",
          description: "Ancoragem IBCT/Gottman traduzida em 1-2 frases (segue 'anchor').",
        },
        reframe_insight: {
          type: "string",
          description: "Insight que vira a chave. 1-2 frases.",
        },
        closing: {
          type: "string",
          description: "Fechamento de autoridade invisível. Sem CTA explícito.",
        },
        full_text: {
          type: "string",
          description:
            "Versão final pronta para postar — texto corrido natural, integrando as 5 camadas. SEM rótulos, SEM 'abertura:', 'fechamento:'. Apenas o conteúdo limpo.",
        },
      },
      required: [
        "theme",
        "objective",
        "format",
        "anchor",
        "opening",
        "pattern_naming",
        "clinical_anchor",
        "reframe_insight",
        "closing",
        "full_text",
      ],
      additionalProperties: false,
    },
  },
};

const TIMED_TOOL = {
  type: "function",
  function: {
    name: "build_timed_script",
    description: "Gera um roteiro com marcação de tempo segundo a segundo.",
    parameters: {
      type: "object",
      properties: {
        theme: { type: "string" },
        duration_seconds: { type: "integer", enum: [30, 60, 90] },
        objective: {
          type: "string",
          enum: ["atrair_paciente", "autoridade", "identificacao"],
        },
        blocks: {
          type: "array",
          description: "Blocos com timecode. Cobrir do 0 até a duração total.",
          items: {
            type: "object",
            properties: {
              start: { type: "integer", description: "segundo de início" },
              end: { type: "integer", description: "segundo de fim" },
              label: {
                type: "string",
                description: "Função do bloco: hook, padrão, ancoragem, reframe, fechamento",
              },
              text: { type: "string", description: "Fala literal a ser gravada." },
              direction: {
                type: "string",
                description: "Direção de cena/expressão (curta).",
              },
            },
            required: ["start", "end", "label", "text", "direction"],
            additionalProperties: false,
          },
        },
        on_screen_text: {
          type: "string",
          description: "Texto que aparece na tela do reel (legenda visual curta).",
        },
        caption: {
          type: "string",
          description: "Legenda do post para acompanhar o reel.",
        },
      },
      required: [
        "theme",
        "duration_seconds",
        "objective",
        "blocks",
        "on_screen_text",
        "caption",
      ],
      additionalProperties: false,
    },
  },
};

const BATCH_TOOL = {
  type: "function",
  function: {
    name: "build_batch",
    description: "Gera N conteúdos variados seguindo o motor narrativo.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              theme: { type: "string" },
              objective: {
                type: "string",
                enum: ["atrair_paciente", "autoridade", "identificacao", "ensinar"],
              },
              format: { type: "string", enum: ["reel", "carrossel", "legenda"] },
              opening: { type: "string" },
              full_text: { type: "string" },
            },
            required: ["theme", "objective", "format", "opening", "full_text"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth lockdown
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
    const mode: "single" | "timed" | "batch" = body.mode ?? "single";

    let tool: any;
    let toolName: string;
    let userMsg: string;

    if (mode === "single") {
      tool = SINGLE_TOOL;
      toolName = "build_relational_content";
      const theme = body.theme ?? body.insight ?? "padrão relacional";
      const objective = body.objective ?? "identificacao";
      const format = body.format ?? "reel";
      const anchor = body.anchor ?? "IBCT+Gottman";
      const avoid: string[] = body.avoid ?? [];
      const audienceContext = body.audience_context ?? "";
      userMsg = `Construa UM conteúdo seguindo o motor narrativo de 5 camadas.

TEMA/INSIGHT: ${theme}
OBJETIVO: ${objective}
FORMATO: ${format}
ANCORAGEM CLÍNICA: ${anchor}
${audienceContext ? `\nCONTEXTO DA AUDIÊNCIA (use como matéria-prima da linguagem, sem copiar literalmente):\n${audienceContext}` : ""}
${avoid.length ? `\nEVITE repetir estas aberturas/ângulos já usados:\n- ${avoid.join("\n- ")}` : ""}

Lembre: nada de clichê, nada de "você sabia", nada de emoji decorativo. Voz clínica humanizada, frases curtas, autoridade pela precisão.`;
    } else if (mode === "timed") {
      tool = TIMED_TOOL;
      toolName = "build_timed_script";
      const theme = body.theme ?? "padrão relacional";
      const duration = body.duration_seconds ?? 60;
      const objective = body.objective ?? "identificacao";
      userMsg = `Construa um roteiro de ${duration}s com timecodes para um reel falado.

TEMA: ${theme}
OBJETIVO: ${objective}
DURAÇÃO: ${duration} segundos

Distribua os blocos cobrindo do 0 ao ${duration}. Cada bloco com fala literal e direção curta de cena. Inclua texto de tela e legenda do post.`;
    } else {
      tool = BATCH_TOOL;
      toolName = "build_batch";
      const quantity: number = Math.min(Math.max(body.quantity ?? 3, 1), 10);
      const focus: string = body.focus ?? "";
      const mix: string = body.mix ?? "distribuir";
      userMsg = `Gere ${quantity} conteúdos variados, todos seguindo o motor narrativo.

${focus ? `FOCO DO PERÍODO: ${focus}` : ""}
MIX DE OBJETIVOS: ${mix === "distribuir" ? "distribua entre atrair_paciente, autoridade, identificacao e ensinar" : `todos com objetivo ${mix}`}

Variar tema, formato e ângulo. Sem repetir aberturas. Sem clichê.`;
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
          { role: "system", content: SYSTEM_PROMPT },
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
        return new Response(
          JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
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
