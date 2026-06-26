import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const BASE_CONTEXT = `Você é o copiloto de uma psicóloga clínica (10+ anos, IBCT e Gottman, público mulheres 25-45) na criação de conteúdo sobre maturidade relacional.

PROIBIDO: clichês, linguagem de coach, inspiração vazia, listas disfarçadas, CTAs de venda, generalizações.
OBRIGATÓRIO: linguagem de fala, virada genuína, observação clínica concreta, posicionamento de referência.

Energia do conteúdo:
- topo: identificação ("isso sou eu")
- meio: confiança clínica ("ela sabe do que fala")
- fundo: reduzir resistência ("talvez eu precise de ajuda")

Responda SEMPRE em JSON válido conforme o schema pedido. Nada além do JSON.`;

type Action = "phase1_read" | "phase2_validate";

function promptFor(action: Action, payload: Record<string, unknown>): string {
  if (action === "phase1_read") {
    return `Analise esta entrada bruta de tema e devolva uma leitura.

ENTRADA:
- tema: ${payload.tema ?? "(vazio)"}
- tipo_entrada: ${payload.tipo_entrada ?? "(não informado)"}
- origem: ${payload.origem ?? "(não informado)"}
- conteúdo bruto: ${payload.conteudo ?? "(vazio)"}
- comentários da audiência: ${payload.conteudo_audiencia ?? "(nenhum)"}
- série: ${payload.serie_nome ?? "(nenhuma)"} ${payload.serie_position ? "ep " + payload.serie_position : ""}

Devolva JSON neste schema EXATO:
{
  "energia_sugerida": "topo" | "meio" | "fundo",
  "observacao": "1 a 3 frases curtas dizendo o que você vê de mais forte aqui e o que ainda falta amadurecer",
  "padroes_audiencia": "string com os padrões que você detectou nos comentários, ou null se não há comentários"
}`;
  }
  return `Valide se a estratégia desta peça está coerente.

ENTRADA:
- tema: ${payload.tema ?? "(vazio)"}
- energia escolhida: ${payload.energia ?? "(nenhuma)"}
- estratégia de criação: ${payload.creation_strategy ?? "(nenhuma)"}
- objetivo: ${payload.objetivo ?? "(vazio)"}
- meta de resultado: ${payload.meta_resultado ?? "(nenhuma)"}

Avalie se energia + estratégia + objetivo + meta estão alinhados. Ex: energia "topo" com meta "agendar sessão" tem conflito (topo gera identificação, não conversão direta).

Devolva JSON neste schema EXATO:
{
  "aprovado_para_roteiro": boolean,
  "status": "alinhado" | "conflito",
  "comentario": "1 a 3 frases explicando o alinhamento ou o conflito",
  "sugestao": "string com a correção sugerida, ou null se está alinhado"
}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");
    const { action, payload } = await req.json();
    if (!action || !["phase1_read", "phase2_validate"].includes(action)) {
      return new Response(JSON.stringify({ error: "action inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = promptFor(action as Action, payload ?? {});

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: BASE_CONTEXT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("studio-agent AI error", res.status, errBody);
      let message = "Falha ao consultar a IA. Tente novamente.";
      if (res.status === 429) message = "Muitas requisições. Aguarde alguns segundos.";
      else if (res.status === 402) message = "Créditos de IA esgotados no workspace.";
      return new Response(JSON.stringify({ error: message, status: res.status }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { raw };
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
