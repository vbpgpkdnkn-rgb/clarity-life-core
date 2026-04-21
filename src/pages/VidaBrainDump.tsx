import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VidaNav } from "@/components/vida/VidaNav";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useBrainDump, useAddBrainDump, useProcessBrainDump, useDeleteBrainDump } from "@/hooks/useBrainDump";
import { useUpsertTask } from "@/hooks/useData";
import { Brain, ArrowRight, Trash2, CheckSquare } from "lucide-react";

export default function VidaBrainDump() {
  const [text, setText] = useState("");
  const [showProcessed, setShowProcessed] = useState(false);
  const { data: items = [] } = useBrainDump(showProcessed);
  const add = useAddBrainDump();
  const process = useProcessBrainDump();
  const del = useDeleteBrainDump();
  const upsertTask = useUpsertTask();

  const handleAdd = () => {
    if (!text.trim()) return;
    add.mutate(text);
    setText("");
  };

  const convertToTask = async (item: any) => {
    upsertTask.mutate({ title: item.content, status: "pendente", priority: "media", scope: "pessoal" });
    process.mutate({ id: item.id, converted_to: "task" });
  };

  return (
    <AppLayout title="Brain dump" subtitle="Esvazie a cabeça. Organize depois.">
      <VidaNav />

      <Card className="p-5 mb-6 border-border/60">
        <div className="flex items-start gap-2">
          <Brain className="h-5 w-5 text-accent mt-1.5 shrink-0" />
          <div className="flex-1">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd(); }}
              placeholder="Despeje aqui qualquer coisa que está ocupando sua mente. Cmd/Ctrl+Enter para adicionar."
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-muted-foreground">{items.length} {showProcessed ? "itens no total" : "itens não processados"}</p>
              <Button size="sm" onClick={handleAdd} disabled={!text.trim()}>Capturar</Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-between items-center mb-3">
        <h2 className="font-display text-lg font-semibold">Itens capturados</h2>
        <Button size="sm" variant="ghost" onClick={() => setShowProcessed(!showProcessed)}>
          {showProcessed ? "Só não processados" : "Mostrar todos"}
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((i: any) => (
          <Card key={i.id} className={`p-3 border-border/60 group ${i.processed ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3">
              <p className="text-sm flex-1">{i.content}</p>
              {!i.processed && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => convertToTask(i)} title="Virar tarefa">
                    <CheckSquare className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => process.mutate({ id: i.id, converted_to: "discarded" })} title="Arquivar">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              <button onClick={() => del.mutate(i.id)} className="opacity-0 group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
            {i.processed && i.converted_to && (
              <p className="text-xs text-muted-foreground mt-1">→ {i.converted_to}</p>
            )}
          </Card>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Vazio. Bom sinal!</p>
        )}
      </div>
    </AppLayout>
  );
}
