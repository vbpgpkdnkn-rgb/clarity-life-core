import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowUp, Copy, Save } from "lucide-react";
import { useRoteirista, ChatMsg } from "@/hooks/useRoteirista";
import { toast } from "sonner";

const FORMATOS = ["Reel", "Carrossel", "Legenda", "Série"];

const QUICK_STARTS = [
  "Tenho uma referência que quero transformar no meu ângulo",
  "Tive uma observação clínica que pode virar conteúdo",
  "Quero falar de relacionamentos além do conflito de casal",
];

const BLOCOS = ["Gancho", "Desenvolvimento", "Virada", "Aterrissagem"];

function parseRoteiro(texto: string): Record<string, string> {
  const lines = texto.split("\n");
  const out: Record<string, string> = {};
  let current: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (current) out[current] = buf.join("\n").trim();
    buf = [];
  };
  for (const line of lines) {
    const t = line.trim();
    const matched = BLOCOS.find((b) => t.toLowerCase() === b.toLowerCase());
    if (matched) {
      flush();
      current = matched;
    } else if (current) {
      buf.push(line);
    }
  }
  flush();
  return out;
}

function stringifyRoteiro(blocos: Record<string, string>): string {
  return BLOCOS.filter((b) => blocos[b] != null)
    .map((b) => `${b}\n${blocos[b]}`)
    .join("\n\n");
}

function isRoteiroText(t: string) {
  return /\bGancho\b/i.test(t) && /\bAterrissagem\b/i.test(t);
}

function countSecs(texto: string): number {
  const words = texto.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words / 2.5);
}

function RoteiroCard({
  texto,
  formato,
  onChange,
  onSave,
  onRefine,
  refining,
}: {
  texto: string;
  formato: string;
  onChange: (next: string) => void;
  onSave: () => void;
  onRefine: (instrucao: string) => void;
  refining: boolean;
}) {
  const blocos = parseRoteiro(texto);
  const secs = countSecs(texto);
  const ok = secs <= 65;
  const [instrucao, setInstrucao] = useState("");

  const updateBloco = (b: string, val: string) => {
    const next = { ...blocos, [b]: val };
    onChange(stringifyRoteiro(next));
  };

  return (
    <Card className="border-accent/30 bg-accent/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Roteiro · {formato}
          </span>
          <Badge
            variant="outline"
            className={
              ok
                ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                : "border-red-500/40 text-red-600 bg-red-500/10"
            }
          >
            {ok ? `~${secs}s ✓` : `~${secs}s — ideal até 60s`}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(texto);
              toast.success("Copiado");
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
          </Button>
          <Button size="sm" variant="outline" onClick={onSave}>
            <Save className="h-3.5 w-3.5 mr-1" /> Salvar no Pipeline
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {BLOCOS.map((b) =>
          blocos[b] != null ? (
            <div key={b}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {b}
              </div>
              <Textarea
                value={blocos[b]}
                onChange={(e) => updateBloco(b, e.target.value)}
                className="border-none bg-transparent focus-visible:ring-0 resize-none px-0 shadow-none min-h-[40px]"
                rows={Math.max(2, blocos[b].split("\n").length)}
              />
            </div>
          ) : null
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-accent/20">
        <input
          value={instrucao}
          onChange={(e) => setInstrucao(e.target.value)}
          placeholder="o que quer ajustar? ex: gancho mais direto"
          className="flex-1 bg-background border border-input rounded-md px-3 py-1.5 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && instrucao.trim() && !refining) {
              onRefine(instrucao.trim());
              setInstrucao("");
            }
          }}
        />
        <Button
          size="sm"
          disabled={!instrucao.trim() || refining}
          onClick={() => {
            onRefine(instrucao.trim());
            setInstrucao("");
          }}
        >
          Refinar
        </Button>
      </div>
    </Card>
  );
}

export default function Roteirista() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [formato, setFormato] = useState("Reel");
  const [roteiroAtual, setRoteiroAtual] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const { sendMessage, isLoading, saveRoteiro } = useRoteirista();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const handleFormatoChange = (f: string) => {
    if (f === formato) return;
    if (messages.length > 0) {
      if (!confirm("Trocar formato vai limpar a conversa. Continuar?")) return;
      setMessages([]);
      setRoteiroAtual(null);
    }
    setFormato(f);
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || isLoading) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    try {
      const reply = await sendMessage(next, formato);
      const isR = isRoteiroText(reply);
      setMessages((prev) => [...prev, { role: "ai", content: reply, isRoteiro: isR }]);
      if (isR) setRoteiroAtual(reply);
    } catch {
      /* toast already handled */
    }
  };

  const updateRoteiroInMessages = (next: string) => {
    setRoteiroAtual(next);
    setMessages((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].isRoteiro) {
          copy[i] = { ...copy[i], content: next };
          break;
        }
      }
      return copy;
    });
  };

  const refine = async (instrucao: string) => {
    if (!roteiroAtual) return;
    const userMsg = `Roteiro atual:\n${roteiroAtual}\n\nAjuste: ${instrucao}`;
    await send(userMsg);
  };

  const handleSave = async () => {
    if (!roteiroAtual) return;
    try {
      await saveRoteiro(roteiroAtual, formato);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <AppLayout title="Roteirista" subtitle="seu roteirista clínico">
      <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
        {/* Seletor formato */}
        <div className="flex gap-2 pb-3 border-b border-border mb-3 flex-wrap">
          {FORMATOS.map((f) => (
            <button
              key={f}
              onClick={() => handleFormatoChange(f)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                formato === f
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Conversa */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6">
              <div>
                <h2 className="font-display text-2xl font-semibold">O que você quer criar hoje?</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Fala o tema, joga a referência, descreve o que está pensando. Sem estrutura, sem
                  formulário.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                {QUICK_STARTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-left text-sm border border-border rounded-lg px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            if (m.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="bg-muted rounded-2xl px-4 py-2.5 max-w-[75%] text-sm whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              );
            }
            if (m.isRoteiro) {
              const isLast =
                i === messages.length - 1 ||
                !messages.slice(i + 1).some((x) => x.isRoteiro);
              return (
                <div key={i}>
                  <RoteiroCard
                    texto={m.content}
                    formato={formato}
                    onChange={(next) => {
                      if (isLast) updateRoteiroInMessages(next);
                    }}
                    onSave={handleSave}
                    onRefine={refine}
                    refining={isLoading}
                  />
                </div>
              );
            }
            return (
              <div key={i} className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl px-4 py-2.5 max-w-[75%] text-sm whitespace-pre-wrap">
                  {m.content}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input base */}
        <div className="border-t border-border pt-3 pb-1">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="escreve aqui…"
              rows={1}
              className="resize-none max-h-32"
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={() => send(input)}
              disabled={isLoading || !input.trim()}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
