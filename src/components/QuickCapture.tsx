import { useState, useEffect } from "react";
import { Plus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MicButton } from "@/components/MicButton";
import { useAddBrainDump } from "@/hooks/useBrainDump";
import { toast } from "sonner";

/**
 * Botão flutuante de captura rápida (Brain Dump global).
 * Reduz fricção: qualquer ideia vai pra inbox sem sair da página.
 * Atalho: tecla "n" (sem foco em input) abre o painel.
 */
export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const add = useAddBrainDump();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (inField) return;
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const submit = () => {
    const v = content.trim();
    if (!v) return;
    add.mutate(v, {
      onSuccess: () => {
        toast.success("Capturado");
        setContent("");
        setOpen(false);
      },
    });
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-accent text-accent-foreground shadow-elevated hover:shadow-soft hover:scale-105 transition-all flex items-center justify-center"
          title="Capturar ideia (n)"
          aria-label="Capturar ideia"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-40 w-[min(92vw,380px)] rounded-lg border border-border bg-card shadow-elevated p-3 animate-in slide-in-from-bottom-2 fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Capturar ideia
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="O que está na sua cabeça? (toque no mic pra ditar)"
              className="min-h-[88px] resize-none text-sm pr-11"
            />
            <div className="absolute right-1.5 top-1.5">
              <MicButton value={content} onChange={setContent} size="sm" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">
              ⌘/Ctrl + Enter • Mic pra ditar
            </span>
            <Button size="sm" onClick={submit} disabled={add.isPending || !content.trim()}>
              <Send className="h-3.5 w-3.5 mr-1" />
              Salvar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
