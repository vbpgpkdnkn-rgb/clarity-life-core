import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SHARED_SYSTEM = `Você é parte de uma esteira VIVA de produção de conteúdo, com MEMÓRIA CONTEXTUAL persistente.
Regras inegociáveis:
1. NUNCA reinicie o raciocínio. Tudo no CONTEXTO foi construído nas etapas anteriores e deve ser respeitado.
2. NUNCA regenere o que não foi explicitamente pedido. Se o usuário pediu refinar UM bloco, devolva APENAS aquele bloco.
3. RESPEITE narrative_core (intent, promise, tension, positioning, tone) e approved_assets. EVITE qualquer padrão em rejected.
4. Refinamento é INCREMENTAL: lapide, não reescreva do zero. Mantenha estrutura, mude o que precisa.
5. SEJA específico, evite generalidades. Use os exemplos e dores do contexto.
6. Para qualquer mudança, devolva também 'why' (por que mudou) e 'impact' (efeito estratégico esperado).
7. Responda SEMPRE em JSON válido, sem markdown wrapper, sem comentários.`;

function buildPrompt(mode: string, agent: string, context: any, payload: any) {
  const ctxBlock = `CONTEXTO DO PROJETO:\n${JSON.stringify(context, null, 2)}\n\nPAYLOAD ATUAL:\n${JSON.stringify(payload, null, 2)}`;

  // ========= MODO REFINE =========
  if (mode === "refine") {
    return `${ctxBlock}\n\nMODO: refine.
O usuário quer refinar UM bloco específico. NÃO regere outros blocos.
Bloco alvo: payload.target_block (text + role)
Instrução: payload.instruction (ex.: "mais emocional", "mais curto", "mais agressivo", "mais curioso", "mais cinematográfico")

Devolva JSON:
{
  "block": { "role": "...", "text": "..." (refinado), "target_seconds": number },
  "why": "1 frase explicando o que mudou",
  "impact": "1 frase sobre o efeito estratégico esperado"
}`;
  }

  // ========= MODO ALTERNATIVES =========
  if (mode === "alternatives") {
    return `${ctxBlock}\n\nMODO: alternatives.
Gere 4 variações do bloco em payload.target_block, cada uma com um sabor diferente.
Mantenha o papel narrativo do bloco. Use o narrative_core e approved_assets.

Devolva JSON:
{
  "alternatives": [
    { "flavor": "mais emocional", "text": "...", "why": "..." },
    { "flavor": "mais curto", "text": "...", "why": "..." },
    { "flavor": "mais provocativo", "text": "...", "why": "..." },
    { "flavor": "mais cinematográfico", "text": "...", "why": "..." }
  ]
}`;
  }

  // ========= MODO CRITIQUE-INLINE =========
  if (mode === "critique-inline") {
    return `${ctxBlock}\n\nMODO: critique-inline.
Analise os blocos em payload.blocks. Para cada problema encontrado, gere uma anotação ANCORADA num bloco específico.
Tipos: weak_hook, repetition, low_emotion, weak_cta, overexplained, rhythm_break, lost_tension, generic.

Devolva JSON:
{
  "annotations": [
    {
      "block_id": "id do bloco",
      "type": "string",
      "severity": "low|medium|high",
      "excerpt": "trecho exato do texto onde mora o problema (curto)",
      "message": "diagnóstico em 1 frase",
      "suggestion": "frase reescrita pronta para aplicar"
    }
  ],
  "overall_score": number,
  "retention_estimate": "baixa|moderada|alta"
}`;
  }

  // ========= MODO NARRATIVE-KEEPER =========
  if (mode === "narrative-keeper") {
    return `${ctxBlock}\n\nMODO: narrative-keeper.
O usuário editou parte do conteúdo (payload.changed). Releia o narrative_core e devolva ajustes mínimos para mantê-lo coerente com a nova edição. NÃO reescreva tudo. Apenas o que precisa.

Devolva JSON:
{
  "narrative_core_patch": {
    "intent"?: "...", "promise"?: "...", "tension"?: "...",
    "positioning"?: "...", "tone"?: "...", "emotional_goal"?: "..."
  },
  "why": "1 frase"
}`;
  }

  // ========= MODO GENERATE (agentes existentes) =========
  switch (agent) {
    case "structurer":
      return `${ctxBlock}\n\nSEU PAPEL: structurer.
Converta o contexto em um arco narrativo de 4 blocos funcionais (introducao, desenvolvimento, conclusao, cta).
Cada bloco precisa de um id estável (b1, b2, b3, b4).

Devolva JSON:
{
  "blocks": [
    {
      "id": "b1",
      "role": "introducao|desenvolvimento|conclusao|cta",
      "target_seconds": number,
      "emotional_goal": "string",
      "strategic_intent": "string",
      "main_idea": "string",
      "micro_hooks": ["..."],
      "strong_phrases": ["..."],
      "tension": "string",
      "transition_to_next": "string",
      "recording_note": "string"
    }
  ],
  "total_target_seconds": number,
  "reasoning": "1-2 frases"
}`;

    case "topic-writer":
      return `${ctxBlock}\n\nSEU PAPEL: topic-writer.
A partir dos blocos da estrutura (payload.blocks), gere TÓPICOS DE GRAVAÇÃO enxutos. Cada tópico com id estável (t1, t2, ...).

Devolva JSON:
{
  "topics": [
    {
      "id": "t1",
      "role": "string",
      "target_seconds": number,
      "emotional_goal": "string",
      "main_idea": "string (1 frase)",
      "micro_hook": "string (1 frase memorável)",
      "strong_phrase": "string (1 frase para falar de cabeça)",
      "transition_to_next": "string curta",
      "recording_note": "string sobre tom/postura/olhar"
    }
  ],
  "reasoning": "1-2 frases"
}`;

    case "script-writer":
      return `${ctxBlock}\n\nSEU PAPEL: script-writer.
Escreva o ROTEIRO FINAL em primeira pessoa, fala natural. Use os tópicos do payload (payload.topics).
Estrutura: hook (≤10s), escalada (15-25s), mecanismo (20-30s), quebra (5-10s), aterrissagem_cta (10-15s).
Cada parágrafo com id estável (p1, p2, ...).

Devolva JSON:
{
  "paragraphs": [
    { "id": "p1", "role": "hook|escalada|mecanismo|quebra|aterrissagem_cta", "text": "...", "target_seconds": number }
  ],
  "tone_check": "string curta",
  "reasoning": "1-2 frases"
}`;

    case "script-critic":
      return `${ctxBlock}\n\nSEU PAPEL: script-critic.
Analise o roteiro em payload.paragraphs. Para cada problema, devolva localização e sugestão APLICÁVEL.

Devolva JSON:
{
  "diagnostics": [
    { "type": "weak_hook|repetition|low_emotion|weak_cta|overexplained|rhythm_break", "severity": "low|medium|high", "paragraph_role": "string", "reason": "string", "suggestion": "string" }
  ],
  "alternatives": { "hooks": ["...", "...", "..."], "ctas": ["...", "...", "..."] },
  "overall_score": number,
  "retention_estimate": "baixa|moderada|alta",
  "reasoning": "1-2 frases"
}`;

    default:
      throw new Error(`agente desconhecido: ${agent}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const body = await req.json();
    const { agent, mode = "generate", context, payload } = body ?? {};
    if (!context) {
      return new Response(JSON.stringify({ error: "context obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mode === "generate" && !agent) {
      return new Response(JSON.stringify({ error: "agent obrigatório no modo generate" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = buildPrompt(mode, agent ?? "", context, payload ?? {});

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SHARED_SYSTEM },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso da IA atingido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`IA gateway: ${aiRes.status} ${t}`);
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { raw: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("content-pipeline-agent error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
