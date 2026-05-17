// Edge function: lê print da agenda enviado pela secretária e extrai sessões
// usando Lovable AI Gateway (Gemini Vision) com tool calling para retorno estruturado.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Require authenticated user (single-user lockdown)
  const _authHeader = req.headers.get("Authorization");
  if (!_authHeader || !_authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const _supa = (await import("https://esm.sh/@supabase/supabase-js@2.45.0")).createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: _authHeader } } }
    );
    const { data: _u, error: _e } = await _supa.auth.getUser(_authHeader.replace("Bearer ", ""));
    if (_e || !_u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  try {
    const { image_data_url, date, patient_names } = await req.json();

    if (!image_data_url || !date) {
      return new Response(
        JSON.stringify({ error: "image_data_url e date são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const knownNames = Array.isArray(patient_names) ? patient_names.filter(Boolean) : [];

    const systemPrompt = `Você extrai a agenda de um(a) psicólogo(a) clínico(a) a partir da imagem (geralmente um print de planilha/agenda enviado pela secretária).
Para cada linha/entrada da agenda, identifique:
- nome do paciente (texto exatamente como aparece)
- horário de início (HH:MM, 24h)
- duração em minutos (se visível, senão deixe null)
- modalidade (online/presencial/hibrido) se inferível, senão null
- status sugerido: "realizada" se houver indício de presença/check, "falta" se houver indício de ausência, "cancelada" se cancelado, caso contrário "agendada"
- valor (price) numérico se visível, senão null
- observação livre se houver

A data já está definida (${date}) — não tente inferir data da imagem.

Pacientes já cadastrados no sistema (use para padronizar o nome quando reconhecer): ${knownNames.length ? knownNames.join("; ") : "(nenhum)"}.

Quando reconhecer um paciente da lista acima, retorne o nome EXATAMENTE como está na lista, no campo "matched_name". Caso não encontre correspondência clara, deixe matched_name como null e mantenha o nome original em "raw_name".`;

    const body = {
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extraia as sessões desta agenda." },
            { type: "image_url", image_url: { url: image_data_url } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_agenda",
            description: "Retorna a lista de sessões extraídas da agenda.",
            parameters: {
              type: "object",
              properties: {
                sessions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      raw_name: { type: "string" },
                      matched_name: { type: ["string", "null"] },
                      start_time: { type: ["string", "null"], description: "HH:MM" },
                      duration_minutes: { type: ["integer", "null"] },
                      modality: { type: ["string", "null"], enum: ["online", "presencial", "hibrido", null] },
                      status: { type: "string", enum: ["agendada", "realizada", "cancelada", "falta"] },
                      price: { type: ["number", "null"] },
                      note: { type: ["string", "null"] },
                    },
                    required: ["raw_name", "status"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["sessions"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_agenda" } },
    };

    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite temporário atingido. Aguarde 1 minuto e tente de novo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações > Workspace > Uso." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const txt = await resp.text();
      console.error("AI gateway error:", resp.status, txt);
      return new Response(JSON.stringify({ error: "Falha ao processar a imagem" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    if (!args) {
      console.error("Sem tool_calls no retorno:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ sessions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = typeof args === "string" ? JSON.parse(args) : args;

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agenda-ocr error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
