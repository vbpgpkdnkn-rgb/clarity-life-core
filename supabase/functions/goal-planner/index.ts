// Goal Planner — IA Executiva de Performance
// Recebe: meta + carga atual (tarefas/eventos por dia) + escopo
// Devolve: prazo sugerido + micro-objetivos + tarefas com due_date distribuídas
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    suggested_deadline: {
      type: "string",
      description: "Data ISO (YYYY-MM-DD) realista considerando carga.",
    },
    deadline_rationale: {
      type: "string",
      description: "Justificativa curta e direta, máximo 200 caracteres.",
    },
    complexity: { type: "string", enum: ["baixa", "media", "alta"] },
    weekly_capacity: {
      type: "number",
      description: "Quantas tarefas desta meta cabem por semana sem sobrecarregar.",
    },
    milestones: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do micro-objetivo, mensurável." },
          deadline: { type: "string", description: "Data ISO YYYY-MM-DD." },
          tasks: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Tarefa específica e executável (verbo no infinitivo)." },
                due_date: { type: "string", description: "Data ISO YYYY-MM-DD distribuída sem sobrecarga." },
                priority: { type: "string", enum: ["alta", "media", "baixa"] },
              },
              required: ["title", "due_date", "priority"],
              additionalProperties: false,
            },
          },
        },
        required: ["name", "deadline", "tasks"],
        additionalProperties: false,
      },
    },
  },
  required: ["suggested_deadline", "deadline_rationale", "complexity", "weekly_capacity", "milestones"],
  additionalProperties: false,
};

const SYSTEM = `Você é o CHEFE DE EXECUÇÃO de metas. Não é coach. Não é motivador. É um gestor sênior que transforma intenção em plano real e cobra entrega.

TOM:
- Direto, factual, imperativo. Sem floreio.
- deadline_rationale começa com o FATO ("Carga atual já tem X tarefas/dia") e termina com a decisão ("Prazo X é o realista.").
- Nomes de tarefas começam com VERBO no imperativo/infinitivo. Específicos e executáveis.
- PROIBIDO: "tente", "que tal", "considere", "vamos", "você pode", motivação genérica.

REGRAS DURAS:
- Prazo realista, nunca otimista. Considere a carga existente. Se o prazo desejado pelo usuário é inviável, IGNORE e proponha o realista — explique por quê.
- Tarefas: ESPECÍFICAS ("Escrever rascunho do capítulo 1", "Validar protótipo com 3 usuários"). NUNCA genéricas ("Trabalhar na meta", "Estudar mais").
- Distribuição: máx 2 tarefas desta meta no mesmo dia. Pule dias com carga >3 ou em busy_days.
- 2 a 6 micro-objetivos. Cada um com 1 a 5 tarefas. Total <= 20 tarefas.
- Datas no passado: PROIBIDO. Comece em D+1 no mínimo.
- Idioma: português do Brasil.`;

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
    const body = await req.json();
    const {
      goal,
      today,
      load_by_day = {}, // { "2026-04-22": 3, ... } tarefas pendentes por dia
      busy_days = [], // dias com eventos pesados
      user_history = {},
      requested_deadline = null,
    } = body;

    if (!goal?.name) {
      return new Response(JSON.stringify({ error: "goal.name é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const userPrompt = `META A PLANEJAR:
- Nome: ${goal.name}
- Tipo: ${goal.kind ?? "tarefas"}
- Escopo: ${goal.scope ?? "pessoal"}
- Descrição: ${goal.description || "(sem descrição)"}
- Prazo desejado pelo usuário: ${requested_deadline || "não informado — você sugere"}
${goal.target_value ? `- Valor alvo: R$ ${goal.target_value}` : ""}
${goal.target_tasks ? `- Tarefas alvo: ${goal.target_tasks}` : ""}

CONTEXTO ATUAL DO USUÁRIO:
- Hoje: ${today}
- Carga atual (tarefas pendentes por dia): ${JSON.stringify(load_by_day)}
- Dias com eventos importantes: ${busy_days.join(", ") || "nenhum"}
- Taxa de execução recente: ${user_history.completion_rate ?? "desconhecida"}

GERE O PLANO COMPLETO conforme schema. Distribua as tarefas APENAS em dias com carga atual <= 3 tarefas. Evite finais de semana se carga semanal já estiver cheia em dias úteis.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_execution_plan",
              description: "Envie o plano de execução estruturado para a meta.",
              parameters: PLAN_SCHEMA,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_execution_plan" } },
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Tente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados na workspace Lovable AI." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error("AI gateway falhou");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Sem tool_call na resposta da IA");
    const plan = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ plan, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("goal-planner error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
