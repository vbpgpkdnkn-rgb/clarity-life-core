import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SHARED_SYSTEM = `Você é parte de uma esteira VIVA de produção de conteúdo, com MEMÓRIA CONTEXTUAL persistente.
Regras inegociáveis:
1. NUNCA reinicie o raciocínio. Tudo no CONTEXTO foi construído nas etapas anteriores e deve ser respeitado.
2. NUNCA regenere o que não foi explicitamente pedido. Se o usuário pediu refinar UM bloco, devolva APENAS aquele bloco.
3. RESPEITE compass (intent, promise, tension, positioning, tone, master_prompt) e approved_assets. EVITE qualquer padrão em rejected.
4. Refinamento é INCREMENTAL: lapide, não reescreva do zero.
5. CONTINUIDADE 1:1: ao expandir uma etapa anterior, NUNCA renomeie blocos, NUNCA mude ordem, NUNCA adicione/remova; apenas EXPANDA.
6. SEJA específico, evite generalidades. Use os exemplos e dores do contexto.
7. Para qualquer mudança, devolva também 'why' e 'impact'.
8. Responda SEMPRE em JSON válido, sem markdown wrapper, sem comentários.
9. IMITE o author_signature quando presente: ritmo, hooks, fechamentos, conectores.`;

function compassBlock(context: any) {
  const compass = context?.compass ?? {};
  const master = compass.master_prompt ?? "";
  const sig = compass.author_signature ?? null;
  let block = "";
  if (master) block += `\n\nMASTER PROMPT (DNA do conteúdo — NUNCA viole):\n${master}`;
  if (sig) block += `\n\nASSINATURA AUTORAL (imite ritmo e estilo):\n${JSON.stringify(sig).slice(0, 1500)}`;
  return block;
}

function buildPrompt(mode: string, agent: string, context: any, payload: any) {
  const ctxBlock = `CONTEXTO DO PROJETO:\n${JSON.stringify(context, null, 2)}${compassBlock(context)}\n\nPAYLOAD ATUAL:\n${JSON.stringify(payload, null, 2)}`;

  if (mode === "refine") {
    return `${ctxBlock}\n\nMODO: refine.
Refinar UM bloco específico. NÃO regere outros blocos.
Devolva JSON:
{
  "block": { "role": "...", "text": "..." (refinado), "target_seconds": number },
  "why": "1 frase",
  "impact": "1 frase"
}`;
  }

  if (mode === "alternatives") {
    return `${ctxBlock}\n\nMODO: alternatives.
Gere 4 variações do bloco em payload.target_block, mantendo o papel narrativo.
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

  if (mode === "critique-inline") {
    return `${ctxBlock}\n\nMODO: critique-inline.
Analise os blocos. Para cada problema, devolva diagnóstico ESTRUTURADO e APLICÁVEL.
Devolva JSON:
{
  "annotations": [
    {
      "block_id": "id do bloco",
      "type": "weak_hook|repetition|low_emotion|weak_cta|overexplained|rhythm_break|lost_tension|generic",
      "severity": "low|medium|high",
      "excerpt": "trecho exato e curto onde mora o problema",
      "problem": "o que está errado em 1 frase objetiva",
      "reason": "por que isso reduz retenção/impacto",
      "impact": "consequência estratégica",
      "suggested_text": "TEXTO REESCRITO pronto para SUBSTITUIR o bloco inteiro"
    }
  ],
  "overall_score": number,
  "retention_estimate": "baixa|moderada|alta"
}`;
  }

  if (mode === "compass-master") {
    return `${ctxBlock}\n\nMODO: compass-master.
Condense TODO o contexto (ideia, intenção, audiência, tom, emoção, objetivo, retenção, densidade, estilo, referências) em um MASTER PROMPT que servirá de DNA para todas as gerações futuras desta esteira.
Devolva JSON:
{
  "master_prompt": "texto denso de 5 a 10 linhas com diretrizes inegociáveis para qualquer geração futura — voz, ritmo, estrutura, emoção, restrições, padrão de hook, padrão de CTA"
}`;
  }

  switch (agent) {
    case "structurer":
      return `${ctxBlock}\n\nSEU PAPEL: structurer.
Converta o contexto em arco narrativo de 4 blocos (introducao, desenvolvimento, conclusao, cta), ids estáveis (b1..b4).
Devolva JSON:
{
  "blocks": [
    {
      "id": "b1", "role": "introducao|desenvolvimento|conclusao|cta",
      "target_seconds": number, "emotional_goal": "string", "strategic_intent": "string",
      "main_idea": "string", "micro_hooks": ["..."], "strong_phrases": ["..."],
      "tension": "string", "transition_to_next": "string", "recording_note": "string"
    }
  ],
  "total_target_seconds": number,
  "reasoning": "1-2 frases"
}`;

    case "topic-writer": {
      const blocks = Array.isArray(payload?.blocks) ? payload.blocks : [];
      const ids = blocks.map((b: any) => b.id).filter(Boolean);
      return `${ctxBlock}\n\nSEU PAPEL: topic-writer.
CONTINUIDADE 1:1 OBRIGATÓRIA: você DEVE devolver EXATAMENTE ${blocks.length} tópicos, na MESMA ORDEM, com os MESMOS IDs (${JSON.stringify(ids)}) e MESMAS roles dos blocos da estrutura. NÃO renomeie, NÃO reordene, NÃO adicione, NÃO remova.
Para cada bloco da estrutura aprovada, EXPANDA em um tópico de gravação operacional (não reescreva a ideia, só aprofunde).
Devolva JSON:
{
  "topics": [
    {
      "id": "<MESMO ID DA ESTRUTURA>", "role": "<MESMO role>",
      "from_block_id": "<MESMO ID>",
      "target_seconds": number, "emotional_goal": "string",
      "main_idea": "<HERDADO da estrutura>",
      "micro_hook": "string (1 frase memorável)",
      "strong_phrase": "string (1 frase para falar de cabeça)",
      "transition_to_next": "string curta",
      "recording_note": "string sobre tom/postura/olhar"
    }
  ],
  "reasoning": "1-2 frases"
}`;
    }

    case "script-writer": {
      const topics = Array.isArray(payload?.topics) ? payload.topics : [];
      const ids = topics.map((t: any) => t.id).filter(Boolean);
      return `${ctxBlock}\n\nSEU PAPEL: script-writer.
CONTINUIDADE 1:1 OBRIGATÓRIA: você DEVE devolver EXATAMENTE ${topics.length} parágrafos, na MESMA ORDEM dos tópicos aprovados (${JSON.stringify(ids)}). Cada parágrafo deve ter "from_topic_id" igual ao id do tópico correspondente. NÃO altere ordem, NÃO mude intenção, NÃO adicione/remova blocos. Apenas EXPANDA cada tópico em fala natural em primeira pessoa.
Devolva JSON:
{
  "paragraphs": [
    { "id": "p<idx>", "from_topic_id": "<id do tópico>", "role": "<MESMA role do tópico>", "text": "...", "target_seconds": number }
  ],
  "tone_check": "string curta",
  "reasoning": "1-2 frases"
}`;
    }

    case "script-critic":
      return `${ctxBlock}\n\nSEU PAPEL: script-critic.
Devolva JSON:
{
  "diagnostics": [
    { "type": "...", "severity": "low|medium|high", "paragraph_role": "string", "reason": "string", "suggestion": "string" }
  ],
  "alternatives": { "hooks": ["..."], "ctas": ["..."] },
  "overall_score": number,
  "retention_estimate": "baixa|moderada|alta",
  "reasoning": "1-2 frases"
}`;

    default:
      throw new Error(`agente desconhecido: ${agent}`);
  }
}

// Garante continuidade 1:1 mesmo se a IA escorregar
function enforceContinuity(agent: string, payload: any, parsed: any) {
  if (agent === "topic-writer" && Array.isArray(payload?.blocks) && Array.isArray(parsed?.topics)) {
    const blocks = payload.blocks;
    parsed.topics = blocks.map((b: any, i: number) => {
      const t = parsed.topics[i] ?? parsed.topics.find((x: any) => x.id === b.id || x.from_block_id === b.id) ?? {};
      return {
        ...t,
        id: b.id,
        from_block_id: b.id,
        role: b.role ?? t.role,
        main_idea: b.main_idea ?? t.main_idea,
        target_seconds: t.target_seconds ?? b.target_seconds,
      };
    });
  }
  if (agent === "script-writer" && Array.isArray(payload?.topics) && Array.isArray(parsed?.paragraphs)) {
    const topics = payload.topics;
    parsed.paragraphs = topics.map((t: any, i: number) => {
      const p = parsed.paragraphs[i] ?? parsed.paragraphs.find((x: any) => x.from_topic_id === t.id) ?? {};
      return {
        ...p,
        id: p.id ?? `p${i + 1}`,
        from_topic_id: t.id,
        role: t.role ?? p.role,
        target_seconds: p.target_seconds ?? t.target_seconds,
      };
    });
  }
  return parsed;
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
      return new Response(JSON.stringify({ error: "agent obrigatório" }), {
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
        return new Response(JSON.stringify({ error: "Limite de uso da IA atingido." }), {
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

    parsed = enforceContinuity(agent ?? "", payload ?? {}, parsed);

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
