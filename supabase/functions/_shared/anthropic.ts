// Adapter: faz chamadas para a API da Anthropic (Claude) expondo a mesma
// forma de resposta OpenAI-compatível que as edge functions já consumiam.
//
// As funções continuam montando o corpo no formato OpenAI
// ({ model, messages, tools?, tool_choice? }) e este módulo traduz para a
// Messages API da Anthropic e converte a resposta de volta.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// Mapeia os modelos que estavam sendo pedidos (Lovable Gateway) para Claude.
function mapModel(model?: string): string {
  if (!model) return "claude-sonnet-4-5";
  const m = model.toLowerCase();
  if (m.includes("pro") || m.includes("gpt-5") && !m.includes("mini") && !m.includes("nano")) {
    return "claude-sonnet-4-5";
  }
  if (m.includes("nano") || m.includes("lite") || m.includes("haiku")) {
    return "claude-haiku-4-5";
  }
  // flash, mini, default → sonnet 4.5 (boa relação custo/qualidade na API)
  return "claude-sonnet-4-5";
}

interface OAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: any;
  tool_call_id?: string;
  name?: string;
}

interface OAITool {
  type: "function";
  function: { name: string; description?: string; parameters: any };
}

interface OAIBody {
  model?: string;
  messages: OAIMessage[];
  tools?: OAITool[];
  tool_choice?: any;
  max_tokens?: number;
  temperature?: number;
}

function toAnthropicMessages(messages: OAIMessage[]) {
  const systemParts: string[] = [];
  const out: any[] = [];
  for (const msg of messages) {
    if (msg.role === "system") {
      if (typeof msg.content === "string") systemParts.push(msg.content);
      else systemParts.push(JSON.stringify(msg.content));
      continue;
    }
    if (msg.role === "tool") {
      out.push({
        role: "user",
        content: [{
          type: "tool_result",
          tool_use_id: msg.tool_call_id ?? "",
          content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
        }],
      });
      continue;
    }
    out.push({
      role: msg.role,
      content: typeof msg.content === "string" ? msg.content : msg.content,
    });
  }
  return { system: systemParts.join("\n\n"), messages: out };
}

function toAnthropicTools(tools?: OAITool[]) {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description ?? "",
    input_schema: t.function.parameters ?? { type: "object", properties: {} },
  }));
}

function toAnthropicToolChoice(tc: any) {
  if (!tc) return undefined;
  if (tc === "auto") return { type: "auto" };
  if (tc === "none") return undefined;
  if (typeof tc === "object" && tc.type === "function" && tc.function?.name) {
    return { type: "tool", name: tc.function.name };
  }
  return { type: "auto" };
}

function buildOpenAIResponse(anthropicData: any) {
  const content = anthropicData?.content ?? [];
  let text = "";
  const toolCalls: any[] = [];
  for (const block of content) {
    if (block.type === "text") text += block.text;
    if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        type: "function",
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input ?? {}),
        },
      });
    }
  }
  return {
    id: anthropicData?.id,
    model: anthropicData?.model,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: text || null,
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
      },
      finish_reason: anthropicData?.stop_reason ?? "stop",
    }],
    usage: anthropicData?.usage,
  };
}

// Substitui o `fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...)`.
// Devolve um objeto compatível com a interface Response usada nas funções:
// `.ok`, `.status`, `.text()`, `.json()`.
export async function aiFetch(body: OAIBody): Promise<Response> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const { system, messages } = toAnthropicMessages(body.messages);
  const tools = toAnthropicTools(body.tools);
  const tool_choice = toAnthropicToolChoice(body.tool_choice);

  const anthropicBody: any = {
    model: mapModel(body.model),
    max_tokens: body.max_tokens ?? 4096,
    messages,
  };
  if (system) anthropicBody.system = system;
  if (tools) anthropicBody.tools = tools;
  if (tool_choice) anthropicBody.tool_choice = tool_choice;
  if (typeof body.temperature === "number") anthropicBody.temperature = body.temperature;

  const resp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(anthropicBody),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("Anthropic API error", resp.status, txt);
    return new Response(txt, { status: resp.status, headers: { "Content-Type": "application/json" } });
  }

  const data = await resp.json();
  const openai = buildOpenAIResponse(data);
  return new Response(JSON.stringify(openai), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
