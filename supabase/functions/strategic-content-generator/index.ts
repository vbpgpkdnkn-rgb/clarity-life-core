// Strategic Content Generator
// Camada estratégica: Intent → Trigger emocional → Conflito → Hook → Insight → Roteiro → CTA invisível
// + Filtro de Decisão (gera dor? gera identificação? cria urgência?)
import { aiFetch } from "../_shared/anthropic.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL = {
  type: "function",
  function: {
    name: "build_strategic_content",
    description:
      "Constrói um conteúdo de alto impacto camada por camada (intent, trigger, conflito, hook, insight, roteiro, CTA invisível) e roda o filtro de decisão (dor, identificação, urgência).",
    parameters: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          description:
            "Objetivo psicológico do conteúdo. Um de: gerar identificação emocional | criar desconforto psicológico | gerar desejo por terapia | posicionar autoridade clínica | quebrar crença limitante.",
        },
        trigger: {
          type: "string",
          description:
            "Gatilho emocional específico do ICP (uma dor real, em 1 linha, em primeira pessoa do singular feminino quando fizer sentido).",
        },
        conflict: {
          type: "string",
          description:
            "Conflito interno em formato curiosity gap: 'você sente X, mas continua fazendo Y'. Frase única, tensa, sem moralizar.",
        },
        hook: {
          type: "string",
          description:
            "Hook de 0-3s. Padrão: 'se você [trigger], isso não é o problema real' (ou variação igualmente disruptiva). Máx 14 palavras. Sem emoji.",
        },
        insight: {
          type: "string",
          description:
            "Insight de autoridade clínica que reframe a dor. Máx 18 palavras. Sem jargão acadêmico.",
        },
        cta: {
          type: "string",
          description:
            "CTA invisível, posicionamento de autoridade. Não pede follow nem comentário. Ex: 'isso aqui normalmente aparece na terapia'.",
        },
        format: {
          type: "string",
          enum: ["reels", "carrossel", "texto", "stories", "video"],
        },
        theme: { type: "string", description: "Tema central em 1-3 palavras." },
        script: {
          type: "string",
          description:
            "Roteiro de 35-50s estruturado em blocos com timecodes (0-3s, 3-10s, 10-20s, 20-35s, 35-50s). Texto direto, primeira pessoa quando couber, sem narração de gênero do espectador.",
        },
        decision: {
          type: "object",
          description:
            "Filtro de decisão. Avalie HONESTAMENTE — não infle. Cada critério é boolean + justificativa de 1 linha.",
          properties: {
            generates_pain: {
              type: "object",
              properties: {
                value: { type: "boolean" },
                reason: { type: "string" },
              },
              required: ["value", "reason"],
              additionalProperties: false,
            },
            generates_identification: {
              type: "object",
              properties: {
                value: { type: "boolean" },
                reason: { type: "string" },
              },
              required: ["value", "reason"],
              additionalProperties: false,
            },
            creates_urgency: {
              type: "object",
              properties: {
                value: { type: "boolean" },
                reason: { type: "string" },
              },
              required: ["value", "reason"],
              additionalProperties: false,
            },
            verdict: {
              type: "string",
              enum: ["postar", "refazer", "descartar"],
              description:
                "postar = passou nos 3. refazer = passou em 2 e dá pra ajustar. descartar = só informa, não gera comportamento.",
            },
            verdict_reason: { type: "string" },
          },
          required: [
            "generates_pain",
            "generates_identification",
            "creates_urgency",
            "verdict",
            "verdict_reason",
          ],
          additionalProperties: false,
        },
      },
      required: [
        "intent",
        "trigger",
        "conflict",
        "hook",
        "insight",
        "cta",
        "format",
        "theme",
        "script",
        "decision",
      ],
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

    const body = await req.json().catch(() => ({}));
    const briefing: string = body.briefing ?? "";
    const angle: string = body.angle ?? ""; // direção opcional dada pela usuária
    const intentHint: string = body.intent ?? "";
    const formatHint: string = body.format ?? "";
    const avoid: string[] = body.avoid ?? []; // hooks/temas já usados
    const refineFrom = body.refine_from ?? null; // resultado anterior, se for refazer

    const systemPrompt = `Você é uma psicóloga estratégica que cria conteúdo para Instagram com objetivo claro: ATIVAR COMPORTAMENTO, não só informar.

Você opera por camadas, em ordem:
1. INTENT — qual reação interna você quer provocar.
2. TRIGGER — uma dor real e específica do ICP.
3. CONFLITO — curiosity gap entre o que ela sente e o que ela faz.
4. HOOK (0-3s) — frase que para o scroll. Direta, sem moralizar, sem clichê.
5. INSIGHT — reframe clínico que muda como ela enxerga o problema.
6. ROTEIRO — 35-50s, com timecodes, em primeira pessoa quando fizer sentido.
7. CTA INVISÍVEL — posicionamento, não pedido. Ativa autoridade.

REGRAS DURAS:
- Sem clichê de coach ("você merece", "se ame primeiro", "tudo passa").
- Sem moralizar a paciente. Você está do lado dela, não julgando.
- Sem prometer cura, diagnóstico, laudo. Você é especialista, não salvadora.
- Sem emoji. Sem CTA explícito de follow/comentário.
- Português brasileiro, tom direto, frases curtas.

DEPOIS de gerar o conteúdo, rode o FILTRO DE DECISÃO com HONESTIDADE BRUTAL:
- generates_pain: o conteúdo faz a pessoa SENTIR a dor, não só ler sobre ela?
- generates_identification: ela vai pensar "isso é sobre mim"?
- creates_urgency: cria desconforto que pede ação interna AGORA, não "um dia"?
Se não tiver os 3, marque verdict='refazer' ou 'descartar'. NÃO infle a avaliação.

${briefing ? `\nBRIEFING DE ESTRATÉGIA DA USUÁRIA (use como bíblia — nicho, ICP, tom, pilares):\n${briefing}\n` : ""}
${angle ? `\nDIREÇÃO/ÂNGULO PEDIDO PELA USUÁRIA: ${angle}\n` : ""}
${intentHint ? `\nINTENT preferido (se fizer sentido): ${intentHint}\n` : ""}
${formatHint ? `\nFORMAT preferido: ${formatHint}\n` : ""}
${avoid.length ? `\nEVITAR repetir estes ângulos/hooks: ${avoid.join(" | ")}\n` : ""}
${refineFrom ? `\nVERSÃO ANTERIOR REPROVADA (refaça mais afiada, atacando os pontos fracos):\n${JSON.stringify(refineFrom)}\n` : ""}`;

    const aiResp = await aiFetch({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Construa UM conteúdo estratégico completo seguindo as 7 camadas e rode o filtro de decisão.",
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "build_strategic_content" } },
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

    // score 0-3
    const d = parsed.decision ?? {};
    const score =
      (d.generates_pain?.value ? 1 : 0) +
      (d.generates_identification?.value ? 1 : 0) +
      (d.creates_urgency?.value ? 1 : 0);
    parsed.score = score;
    parsed.approved = score === 3 && d.verdict === "postar";

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("strategic-content-generator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
