// Chat de refinamento de ideia editorial
// Conversa entre a psicóloga e a IA para lapidar uma ideia antes de enviar ao Motor Relacional.
// Quando ela dizer que está pronta / pedir síntese, a IA retorna um JSON estruturado com a ideia refinada.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você está refinando uma ideia de conteúdo junto com uma psicóloga clínica especializada em relacionamentos (IBCT + Gottman).

Seu papel NÃO é gerar um roteiro agora. É ouvir o que ela quer dizer, capturar o ponto de vista DELA e ajudar a construir uma ideia completamente autoral — que parte da audiência real, passa pela lente clínica dela e chega em algo original que ninguém mais poderia criar.

REGRAS:
- Não sugira estruturas ou roteiros prontos.
- Faça perguntas curtas e específicas só quando precisar entender melhor (no máximo 1 por mensagem).
- Confirme em palavras o que entendeu antes de propor algo novo.
- Se ela falar em linguagem clínica, traduza para comportamento. Se falar em comportamento, devolva nomeando o padrão.
- Quando ela aprovar OU pedir a síntese final, devolva uma ÚLTIMA mensagem que comece com a tag exata "[SÍNTESE]" e contenha em texto corrido: tema · ângulo autoral · gancho · o que ela quer que a audiência sinta ou pense depois de assistir.

Não use emojis. Não use jargão de coach. Tom direto, humano, clínico.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
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
    if (e || !u?.user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const context = body.context ?? {};
    const messages: { role: "user" | "assistant"; content: string }[] = Array.isArray(body.messages) ? body.messages : [];

    const contextBlock = `CONTEXTO DA IDEIA:
- Tema: ${context.title ?? "(sem título)"}
- Ângulo inicial: ${context.angle_adopted ?? "(não informado)"}
- Gancho inicial: ${context.hook ?? "(não informado)"}
- Base na audiência: ${context.audience_evidence ?? "(não informado)"}
- O que a psicóloga já pensou: ${context.my_perspective ?? "(não informado)"}
- Comentários relevantes:\n${(context.comments ?? "").slice(0, 1500)}`;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurado");

    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextBlock },
      ...messages,
    ];

    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gemini-2.5-flash", messages: aiMessages }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error", aiResp.status, await aiResp.text());
      return new Response(JSON.stringify({ error: "Falha na IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";
    const isSynthesis = /^\s*\[S[ÍI]NTESE\]/i.test(content);

    return new Response(JSON.stringify({ content, is_synthesis: isSynthesis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("idea-refinement-chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
