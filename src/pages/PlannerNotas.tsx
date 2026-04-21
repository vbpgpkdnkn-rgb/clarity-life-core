import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PlannerNav } from "@/components/planner/PlannerNav";
import { PencilTabs } from "@/components/planner/PencilTabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFreeNotes, useUpsertFreeNote, useDeleteFreeNote } from "@/hooks/usePlanner";
import { Plus, Pin, Trash2 } from "lucide-react";

export default function PlannerNotas() {
  const { data: notes = [] } = useFreeNotes();
  const upsert = useUpsertFreeNote();
  const del = useDeleteFreeNote();

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = notes.find((n: any) => n.id === activeId) || null;

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [drawing, setDrawing] = useState<string | null>(null);

  useEffect(() => {
    if (active) {
      setTitle(active.title || "");
      setText(active.content_rich || "");
      setDrawing(active.content_drawing || null);
    } else {
      setTitle(""); setText(""); setDrawing(null);
    }
  }, [activeId]);

  // auto-select first
  useEffect(() => {
    if (!activeId && notes.length) setActiveId(notes[0].id);
  }, [notes, activeId]);

  const newNote = async () => {
    const r: any = await upsert.mutateAsync({ title: "Nova nota", content_rich: "", content_drawing: null });
    if (r?.id) setActiveId(r.id);
  };

  const save = (patch: any = {}) => {
    if (!active) return;
    upsert.mutate({ id: active.id, title, content_rich: text, content_drawing: drawing, pinned: active.pinned, ...patch });
  };

  const togglePin = () => {
    if (!active) return;
    upsert.mutate({ id: active.id, title, content_rich: text, content_drawing: drawing, pinned: !active.pinned });
  };

  const remove = () => {
    if (!active) return;
    if (!confirm("Remover esta nota?")) return;
    const id = active.id;
    setActiveId(null);
    del.mutate(id);
  };

  return (
    <AppLayout
      title="Notas livres"
      subtitle="Pensamentos, ideias, rabiscos"
      action={<Button size="sm" onClick={newNote}><Plus className="h-4 w-4 mr-1" /> Nova</Button>}
    >
      <PlannerNav />

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        {/* Lista */}
        <Card className="shadow-soft p-2 max-h-[600px] overflow-y-auto">
          {notes.length === 0 && <p className="text-sm text-muted-foreground p-4">Sem notas. Crie a primeira.</p>}
          {notes.map((n: any) => (
            <button
              key={n.id}
              onClick={() => setActiveId(n.id)}
              className={`w-full text-left rounded-md p-3 mb-1 transition-colors ${activeId === n.id ? "bg-muted" : "hover:bg-muted/50"}`}
            >
              <div className="flex items-center gap-2">
                {n.pinned && <Pin className="h-3 w-3 text-accent shrink-0" />}
                <span className="text-sm font-medium truncate flex-1">{n.title || "Sem título"}</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {new Date(n.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </div>
            </button>
          ))}
        </Card>

        {/* Editor */}
        {active ? (
          <Card className="shadow-soft p-5">
            <div className="flex items-center gap-2 mb-4">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => save()}
                placeholder="Título"
                className="border-0 shadow-none focus-visible:ring-0 text-xl font-display p-0"
              />
              <Button size="sm" variant="ghost" onClick={togglePin} title={active.pinned ? "Desafixar" : "Fixar"}>
                <Pin className={`h-4 w-4 ${active.pinned ? "text-accent fill-accent" : ""}`} />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => save()}>Salvar</Button>
              <Button size="sm" variant="ghost" onClick={remove} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <PencilTabs
              textValue={text}
              drawingValue={drawing}
              onTextChange={setText}
              onDrawingChange={(v) => { setDrawing(v); save({ content_drawing: v }); }}
              textPlaceholder="Comece a escrever..."
              drawingHeight={500}
            />
            <p className="text-xs text-muted-foreground mt-2">Texto salva ao clicar em "Salvar". Desenho salva automaticamente.</p>
          </Card>
        ) : (
          <Card className="shadow-soft p-10 text-center">
            <p className="text-muted-foreground mb-4">Selecione ou crie uma nota.</p>
            <Button onClick={newNote}><Plus className="h-4 w-4 mr-1" /> Nova nota</Button>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
