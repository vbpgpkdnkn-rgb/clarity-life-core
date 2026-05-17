// Sequência de stories — 4 a 7 stories conectados, narrativa autoral.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você cria sequências de stories para uma psicóloga clínica especializada em relacionamentos (IBCT + Gottman).
Os stories NÃO são resumo do conteúdo principal — são uma continuação da conversa com a audiência.
Cada story tem uma razão de existir: aprofundar um ponto, mostrar bastidor clínico, gerar conexão pessoal ou provocar engajamento.
A narrativa é fluida — quem assiste o story 1 quer assistir o 2.
Tom: direto, sem rodeios, clínico e humano. Nunca "bom dia", nunca motivacional genérico.
Cada story deve ser específico e autoral.
O último story sempre tem uma interação real (caixinha de perguntas, enquete ou pergunta aberta).`;

const TOOL = {
  type: "function",
  function: {
    name: "build_story_sequence",
    description: "Gera sequência de stories conectados.",
    parameters: {
      type: "object",
      properties: {
        stories: {
          type: "array",
          minItems: 4,
          maxItems: 7,
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Função do story (Abertura, Desenvolvimento, Bastidor, Engajamento etc.)" },
              type: { type: "string", enum: ["texto", "video_curto", "enquete", "caixinha", "imagem"] },
              narrative: { type: "string", description: "O que ela faz/diz neste story." },
              text_overlay: { type: "string", description: "Texto que aparece sobreposto, se aplicável." },
              connection_to_next: { type: "string", description: "Como leva ao próximo story." },
              interaction: { type: "string", description: "Se for último ou interativo, a pergunta/poll. Caso contrário, vazio." },
            },
            required: ["label", "type", "narrative", "text_overlay", "connection_to_next", "interaction"],
            additionalProperties: false,
          },
        },
      },
      required: ["stories"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const supa = (await import("https://esm.sh/@supabase/supabase-js@2.45.0")).createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u, error: e } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (e || !u?.user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const theme: string = body.theme ?? "";
    const sourceContent: string = body.source_content ?? "";
    const objective: string = body.objective ?? "aprofundar"; // aprofundar / bastidor / dms / conexao
    const tone: string = body.tone ?? "mesmo"; // mesmo / pessoal / didatico
    const quantity: number | "auto" = body.quantity ?? "auto";

    const userMsg = `Gere uma sequência de stories.
${quantity === "auto" ? "Quantidade: você decide entre 4 e 7." : `Quantidade: ${quantity} stories.`}
OBJETIVO: ${objective}
TOM: ${tone}
TEMA: ${theme || "(usar conteúdo de origem)"}
${sourceContent ? `\nCONTEÚDO DE ORIGEM (para continuar a conversa, NÃO resumir):\n${sourceContent.slice(0, 2000)}` : ""}

Cada story deve ter razão de existir. O último termina em interação real.`;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurado");

    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-pro",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userMsg }],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "build_story_sequence" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Limite atingido" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Falha na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await aiResp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("IA não retornou estrutura");
    return new Response(args, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("stories-sequence-generator error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
