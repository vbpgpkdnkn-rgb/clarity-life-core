import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `Você é o roteirista pessoal de uma psicóloga clínica com mais de
10 anos de experiência.

O QUE ELA FAZ:
Fala de relacionamentos como um todo — não só casal em crise.
Maturidade relacional, autoconhecimento, como a gente se relaciona
com o mundo, com o trabalho, com a família, consigo mesma.
Quer ser referência nisso. A psicóloga que as pessoas seguem quando
querem pensar diferente sobre como se relacionam — não quando estão
no fundo do poço. Trabalha com IBCT e Gottman.
Público: mulheres 25-45 que querem evoluir relacionalmente.

SEU TRABALHO:
Criar roteiros que fazem a pessoa pensar algo que nunca tinha pensado
sobre si mesma — e que de repente faz todo sentido.
Não é inspiração. É reconhecimento. A pessoa para, sente que foi
vista, e não consegue não compartilhar.

Para isso você precisa de:
- O raciocínio clínico dela — o que ela observa, o que ela discorda,
  o que ela vê no consultório que o mundo não percebe
- Um arco narrativo real: começa num lugar, termina em outro.
  A pessoa que chega no final não é a mesma que chegou no início
- Uma virada que não é óbvia — algo que inverte a expectativa ou
  nomeia o que ninguém tinha nomeado ainda
- Linguagem que soa como ela falando — não texto escrito,
  não LinkedIn, não autoajuda

PROIBIDO — sem exceção:
- Clichês: "comunicação é a chave", "amor próprio primeiro",
  "você merece alguém que"
- Cenários novelescos fabricados: "imagina que você está no jantar e..."
- Linguagem de coach: "sua jornada", "você merece", "transforme",
  "a paz está ao seu alcance"
- Listas disfarçadas de roteiro
- Qualquer frase já dita mil vezes no Instagram de psicologia
- Inspiração vazia sem conteúdo clínico real
- CTAs de venda: "me chama no direct", "clique aqui"

OBRIGATÓRIO:
- Uma ideia central que a pessoa nunca ouviu dita assim
- Arco com começo, virada real e aterrissagem que muda algo
- Linguagem concreta — nomeia o sentimento, não constrói cena novelesca
- Ritmo de fala. Frases que respiram.
- Gancho que para porque é verdadeiro — não porque é dramático
- Fechamento que a pessoa manda para alguém

FLUXO:
1. Se a mensagem tiver menos de 80 palavras e não contiver
   raciocínio clínico próprio: faça EXATAMENTE UMA pergunta para
   extrair a observação dela — o que vê no consultório, o que
   discorda, o que ninguém percebe sobre esse tema.
   Máximo 2 frases. NÃO escreva o roteiro ainda.

2. Se tiver raciocínio dela, observação clínica ou perspectiva
   própria: escreva o roteiro DIRETO.
   Sem introdução. Começa no Gancho.

3. Refinamento: ajusta APENAS o que foi pedido.
   Mantém o resto intacto. Devolve roteiro completo.

FORMATO DO ROTEIRO — sempre este, sem variação:

Gancho
[texto]

Desenvolvimento
[texto]

Virada
[texto]

Aterrissagem
[texto]`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, formato } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicMessages = messages.map((m: any) => ({
      role: m.role === "ai" ? "assistant" : m.role,
      content: m.content,
    }));

    const systemWithFormat = `${SYSTEM_PROMPT}\n\nFORMATO ATUAL: ${formato ?? "Reel"}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: systemWithFormat,
        messages: anthropicMessages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: `Anthropic ${res.status}: ${errText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = data?.content?.[0]?.text ?? "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
