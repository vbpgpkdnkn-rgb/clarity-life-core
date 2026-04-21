import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VidaNav } from "@/components/vida/VidaNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCleaningTasks, useUpsertCleaningTask, useLogCleaning, useDeleteCleaningTask } from "@/hooks/useVida";
import { CheckCircle2, Plus, Trash2, Sparkles } from "lucide-react";

const FREQ = [
  { v: "diaria", label: "Diária" },
  { v: "semanal", label: "Semanal" },
  { v: "quinzenal", label: "Quinzenal" },
  { v: "mensal", label: "Mensal" },
];

const FREQ_DAYS: Record<string, number> = { diaria: 1, semanal: 7, quinzenal: 15, mensal: 30 };

export default function VidaLimpeza() {
  const { data: tasks = [] } = useCleaningTasks();
  const upsert = useUpsertCleaningTask();
  const log = useLogCleaning();
  const del = useDeleteCleaningTask();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<any>({ name: "", frequency: "semanal", area: "" });

  const save = () => {
    if (!form.name.trim()) return;
    upsert.mutate(form);
    setForm({ name: "", frequency: "semanal", area: "" });
    setAdding(false);
  };

  const isPending = (t: any) => {
    if (!t.last_done) return true;
    const days = (Date.now() - new Date(t.last_done).getTime()) / 86400000;
    return days >= FREQ_DAYS[t.frequency];
  };

  const grouped = tasks.reduce((acc: Record<string, any[]>, t: any) => {
    const k = t.area || "Geral";
    (acc[k] ||= []).push(t);
    return acc;
  }, {});

  return (
    <AppLayout
      title="Limpeza"
      subtitle="Rotina por frequência"
      action={<Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4 mr-1" />Nova</Button>}
    >
      <VidaNav />

      {adding && (
        <Card className="p-4 mb-4 border-accent/40">
          <div className="grid sm:grid-cols-3 gap-2">
            <Input placeholder="Tarefa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Área (cozinha, banheiro...)" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FREQ.map((f) => <SelectItem key={f.v} value={f.v}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 mt-2"><Button size="sm" onClick={save}>Salvar</Button><Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button></div>
        </Card>
      )}

      {Object.keys(grouped).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">Adicione sua primeira tarefa de limpeza.</p>
      )}

      <div className="space-y-6">
        {Object.entries(grouped).map(([area, items]) => (
          <div key={area}>
            <h2 className="font-display text-base font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> {area}
            </h2>
            <div className="space-y-1">
              {items.map((t: any) => {
                const pending = isPending(t);
                return (
                  <Card key={t.id} className={`p-3 border-border/60 group ${pending ? "" : "opacity-50"}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => log.mutate(t.id)}>
                        <CheckCircle2 className={`h-4 w-4 ${pending ? "text-muted-foreground hover:text-accent" : "text-accent"}`} />
                      </button>
                      <div className="flex-1">
                        <p className="text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {FREQ.find((f) => f.v === t.frequency)?.label}
                          {t.last_done ? ` · última ${new Date(t.last_done).toLocaleDateString("pt-BR")}` : " · nunca feita"}
                        </p>
                      </div>
                      {pending && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Pendente</span>}
                      <button onClick={() => del.mutate(t.id)} className="opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
