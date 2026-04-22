import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MicButton } from "@/components/MicButton";
import { useUpsertTask } from "@/hooks/useData";
import { todayISO } from "@/lib/format";
import { CheckCircle2, Loader2, Mic, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * Rota /quick-add — recebe ?title= via URL e cria uma tarefa automaticamente.
 *
 * Uso típico (Siri Shortcuts iOS/iPad):
 * 1. Abrir app Atalhos (Shortcuts)
 * 2. Criar atalho "Nova tarefa Clarity"
 * 3. Ação: Pedir entrada (texto, ditado por voz)
 * 4. Ação: Abrir URL → https://clarity-life-core.lovable.app/quick-add?title=[texto-ditado]&scope=pessoal
 * 5. "Ei Siri, nova tarefa Clarity"
 */
export default function QuickAdd() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const upsert = useUpsertTask();
  const [title, setTitle] = useState(params.get("title") ?? "");
  const [done, setDone] = useState(false);
  const [autoCreated, setAutoCreated] = useState(false);
  const scope = (params.get("scope") as "pessoal" | "profissional") ?? "pessoal";
  const priority = (params.get("priority") as "alta" | "media" | "baixa") ?? "media";
  const auto = params.get("auto") !== "false"; // default: cria sozinho se vier title

  const create = async (t?: string) => {
    const finalTitle = (t ?? title).trim();
    if (!finalTitle) {
      toast.error("Informe um título");
      return;
    }
    try {
      await upsert.mutateAsync({
        title: finalTitle,
        scope,
        priority,
        status: "pendente",
        due_date: todayISO(),
      });
      setDone(true);
      setTimeout(() => navigate("/"), 1500);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao criar tarefa");
    }
  };

  // Auto-cria se já veio o título via URL (fluxo Siri)
  useEffect(() => {
    const initial = params.get("title");
    if (initial && auto && !autoCreated) {
      setAutoCreated(true);
      create(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 text-center max-w-md w-full border-border/60 shadow-none">
          <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
          <h1 className="font-display text-2xl font-semibold mb-2">Tarefa criada</h1>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-xs text-muted-foreground">Voltando para o Foco…</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="p-6 sm:p-8 max-w-md w-full border-border/60 shadow-none">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-accent mb-3">
          <Sparkles className="h-3 w-3" /> Captura rápida
        </div>
        <h1 className="font-display text-2xl font-semibold mb-1">Nova tarefa</h1>
        <p className="text-sm text-muted-foreground mb-5">
          Dite ou digite. Ideal para Siri, atalhos e captura no iPad.
        </p>

        <div className="flex gap-2 mb-3">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="O que precisa ser feito?"
            onKeyDown={(e) => { if (e.key === "Enter") create(); }}
          />
          <MicButton value={title} onChange={setTitle} size="md" />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-5">
          <span className="px-2 py-0.5 rounded-full bg-muted capitalize">{scope}</span>
          <span className="px-2 py-0.5 rounded-full bg-muted capitalize">{priority}</span>
          <span className="px-2 py-0.5 rounded-full bg-muted">hoje</span>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => create()} disabled={upsert.isPending || !title.trim()} className="flex-1">
            {upsert.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mic className="h-4 w-4 mr-2" />}
            Criar tarefa
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>Cancelar</Button>
        </div>

        <details className="mt-6 text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">Como configurar com Siri</summary>
          <ol className="mt-2 space-y-1 list-decimal list-inside leading-relaxed">
            <li>Abra o app <strong>Atalhos</strong> no iPad/iPhone</li>
            <li>Toque em <strong>+</strong> → "Adicionar ação"</li>
            <li>Procure <strong>"Pedir entrada"</strong> (texto)</li>
            <li>Adicione <strong>"Abrir URL"</strong> com:<br/>
              <code className="text-[10px] bg-muted px-1 rounded">{location.origin}/quick-add?title=[Entrada Fornecida]</code>
            </li>
            <li>Renomeie para "Nova tarefa Clarity"</li>
            <li>Diga: <em>"Ei Siri, nova tarefa Clarity"</em></li>
          </ol>
        </details>
      </Card>
    </div>
  );
}
