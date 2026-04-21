import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VidaNav } from "@/components/vida/VidaNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDreamboard, useUpsertDream, useDeleteDream } from "@/hooks/useVida";
import { useLifeAreas } from "@/hooks/useLifeAreas";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function VidaDreamboard() {
  const { data: items = [] } = useDreamboard();
  const { data: areas = [] } = useLifeAreas();
  const upsert = useUpsertDream();
  const del = useDeleteDream();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<any>({ title: "", description: "", area_id: null, image_url: "" });

  const save = () => {
    if (!form.title.trim()) return;
    upsert.mutate({ ...form, position: items.length });
    setForm({ title: "", description: "", area_id: null, image_url: "" });
    setAdding(false);
  };

  return (
    <AppLayout
      title="Dreamboard"
      subtitle="Visualização viva dos seus sonhos"
      action={<Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>}
    >
      <VidaNav />

      {adding && (
        <Card className="p-4 mb-4 border-accent/40">
          <div className="space-y-2">
            <Input placeholder="Sonho ou objetivo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input placeholder="URL da imagem (opcional)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            <Select value={form.area_id ?? "none"} onValueChange={(v) => setForm({ ...form, area_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem área</SelectItem>
                {areas.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button size="sm" onClick={save}>Salvar</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
            </div>
          </div>
        </Card>
      )}

      {items.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground text-center py-12">
          Comece adicionando seu primeiro sonho.
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((i: any) => {
          const area = areas.find((a: any) => a.id === i.area_id);
          return (
            <Card key={i.id} className={`p-0 overflow-hidden border-border/60 group ${i.achieved ? "opacity-60" : ""}`}>
              {i.image_url && (
                <div className="aspect-video bg-muted overflow-hidden">
                  <img src={i.image_url} alt={i.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`font-medium ${i.achieved ? "line-through" : ""}`}>{i.title}</h3>
                  <button
                    onClick={() => upsert.mutate({ id: i.id, achieved: !i.achieved, achieved_at: !i.achieved ? new Date().toISOString() : null })}
                  >
                    {i.achieved ? <CheckCircle2 className="h-4 w-4 text-accent" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>
                {i.description && <p className="text-xs text-muted-foreground mt-1">{i.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  {area ? (
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: area.color + "20", color: area.color }}>
                      {area.name}
                    </span>
                  ) : <span />}
                  <button onClick={() => del.mutate(i.id)} className="opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
