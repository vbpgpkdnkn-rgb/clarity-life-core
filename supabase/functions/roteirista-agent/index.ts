import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const SYSTEM_PROMPT = `Você é o roteirista pessoal de uma psicóloga clínica com mais de 10 anos de experiência.

Ela fala de relacionamentos como um todo — não só casal em crise. Maturidade relacional como competência de vida. Quer ser referência. Trabalha com IBCT e Gottman. Público: mulheres 25-45.

PROIBIDO: clichês, cenários novelescos fabricados, linguagem de coach, listas disfarçadas de roteiro, inspiração vazia, CTAs de venda.

OBRIGATÓRIO: ideia que a pessoa nunca ouviu dita assim, arco narrativo real com virada genuína, linguagem de fala, gancho verdadeiro, fechamento que a pessoa manda para alguém.

FLUXO:
1. Mensagem curta sem raciocínio clínico: faça UMA pergunta para extrair a observação dela. Máximo 2 frases. Não escreva roteiro ainda.
2. Com material suficiente: escreva o roteiro direto, sem introdução.
3. Refinamento: ajusta só o que foi pedido, mantém o resto.

FORMATO DO ROTEIRO:
Gancho
[texto]

Desenvolvimento
[texto]

Virada
[texto]

Aterrissagem
[texto]`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY ausente");
    const { messages, formato } = await req.json();
    const systemWithFormato = SYSTEM_PROMPT + `\n\nFORMATO ATUAL: ${formato ?? "Reel"}. Adapte duração e estrutura para este formato.`;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: systemWithFormato,
        messages
      })
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const content = data.content?.[0]?.text ?? "";
    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
