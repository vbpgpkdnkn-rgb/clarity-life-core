import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SHARED_SYSTEM = `Você é parte de uma esteira de produção de conteúdo com MEMÓRIA CONTEXTUAL.
Regras inegociáveis:
1. NUNCA reinicie o raciocínio. Tudo no CONTEXTO foi construído nas etapas anteriores e deve ser respeitado.
2. RESPEITE approved_assets (use ou referencie). EVITE qualquer padrão listado em rejected.
3. MANTENHA o tom, ângulo e posicionamento do projeto. Não mude de direção sem motivo explícito.
4. Trabalhe de forma INCREMENTAL: refine, não reescreva do zero.
5. SEJA específico, evite generalidades. Use os exemplos e dores do contexto.
6. Responda SEMPRE em JSON válido, sem markdown wrapper, sem comentários.`;

function buildPrompt(agent: string, context: any, payload: any) {
  const ctxBlock = `CONTEXTO DO PROJETO:\n${JSON.stringify(context, null, 2)}\n\nPAYLOAD ATUAL:\n${JSON.stringify(payload, null, 2)}`;

  switch (agent) {
    case "structurer":
      return `${ctxBlock}\n\nSEU PAPEL: structurer.
Converta o contexto em um arco narrativo de 4 blocos funcionais:
- introducao (objetivo: fisgar)
- desenvolvimento (objetivo: aprofundar/explicar mecanismo)
- conclusao (objetivo: aterrissar e gerar identificação)
- cta (objetivo: ação clara, UMA SÓ)

Devolva JSON:
{
  "blocks": [
    {
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
  "reasoning": "1-2 frases sobre por que essa estrutura"
}`;

    case "topic-writer":
      return `${ctxBlock}\n\nSEU PAPEL: topic-writer.
A partir dos blocos da estrutura (em payload.blocks), gere TÓPICOS DE GRAVAÇÃO enxutos — não roteiro, não falas longas. Apenas o que a pessoa precisa para gravar com naturalidade.
Cada tópico deve ser FUNCIONAL: objetivo + ideia central + 1 micro-hook + 1 frase forte + nota de gravação.
NÃO escreva parágrafos. Use frases curtas e diretas.

Devolva JSON:
{
  "topics": [
    {
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
Escreva o ROTEIRO FINAL como uma fala natural, autoral, em primeira pessoa. Use os tópicos do payload (payload.topics) como espinha dorsal.
Estrutura cinematográfica:
- hook (≤10s): pergunta/afirmação/cena que para o scroll
- escalada (15-25s): aumenta tensão e curiosidade
- mecanismo (20-30s): explica o porquê com clareza
- quebra (5-10s): vira a expectativa ou aprofunda
- aterrissagem_cta (10-15s): conclusão emocional + UMA ação

NUNCA use clichês de coach. NUNCA comece com "você sabia que". Use as approved_assets do contexto sempre que fizer sentido.

Devolva JSON:
{
  "paragraphs": [
    { "role": "hook|escalada|mecanismo|quebra|aterrissagem_cta", "text": "...", "target_seconds": number }
  ],
  "tone_check": "string curta sobre como ficou o tom",
  "reasoning": "1-2 frases"
}`;

    case "script-critic":
      return `${ctxBlock}\n\nSEU PAPEL: script-critic.
Analise o roteiro em payload.paragraphs como um editor estratégico. Procure: hook fraco, repetição, baixa emoção, perda de retenção, CTA fraco, excesso de explicação, quebra de ritmo.
Para cada problema, devolva localização, motivo e sugestão APLICÁVEL (não vaga).
Inclua alternativas: 3 hooks novos, 3 CTAs novos.

Devolva JSON:
{
  "diagnostics": [
    { "type": "weak_hook|repetition|low_emotion|weak_cta|overexplained|rhythm_break", "severity": "low|medium|high", "paragraph_role": "string", "reason": "string", "suggestion": "string" }
  ],
  "alternatives": {
    "hooks": ["...", "...", "..."],
    "ctas": ["...", "...", "..."]
  },
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
    const { agent, context, payload } = body ?? {};
    if (!agent || !context) {
      return new Response(JSON.stringify({ error: "agent e context obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = buildPrompt(agent, context, payload ?? {});

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
