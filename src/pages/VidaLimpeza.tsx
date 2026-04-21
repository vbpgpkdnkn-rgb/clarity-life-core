import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VidaNav } from "@/components/vida/VidaNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCleaningTasks, useUpsertCleaningTask, useLogCleaning, useDeleteCleaningTask } from "@/hooks/useVida";
import { CheckCircle2, Plus, Trash2, Sparkles, Pencil, Calendar, Clock } from "lucide-react";
import { WeekdayPicker } from "@/components/vida/WeekdayPicker";
import { WEEKDAY_LABELS } from "@/lib/recurrence";
import { toast } from "sonner";

const FREQ = [
  { v: "diaria", label: "Diária" },
  { v: "semanal", label: "Semanal" },
  { v: "quinzenal", label: "Quinzenal" },
  { v: "mensal", label: "Mensal" },
];

const FREQ_DAYS: Record<string, number> = { diaria: 1, semanal: 7, quinzenal: 15, mensal: 30 };

const emptyForm = () => ({
  id: undefined,
  name: "",
  area: "",
  frequency: "semanal",
  weekdays: [] as number[],
  time_of_day: "",
  notes: "",
});

export default function VidaLimpeza() {
  const { data: tasks = [] } = useCleaningTasks();
  const upsert = useUpsertCleaningTask();
  const log = useLogCleaning();
  const del = useDeleteCleaningTask();
  const [form, setForm] = useState<any | null>(null);

  const startNew = () => setForm(emptyForm());
  const startEdit = (t: any) =>
    setForm({
      id: t.id,
      name: t.name ?? "",
      area: t.area ?? "",
      frequency: t.frequency ?? "semanal",
      weekdays: t.weekdays ?? [],
      time_of_day: t.time_of_day ?? "",
      notes: t.notes ?? "",
    });

  const save = async () => {
    if (!form?.name.trim()) {
      toast.error("Dê um nome à tarefa");
      return;
    }
    if (form.frequency === "semanal" && (!form.weekdays || form.weekdays.length === 0)) {
      toast.error("Escolha pelo menos um dia da semana");
      return;
    }
    const payload = {
      ...form,
      time_of_day: form.time_of_day || null,
      notes: form.notes || null,
    };
    await upsert.mutateAsync(payload);
    toast.success(
      form.weekdays?.length
        ? `Salvo · gerando tarefas para ${form.weekdays.length} dia(s)/sem nas próximas 4 semanas`
        : "Salvo",
    );
    setForm(null);
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

  const weekdaysSummary = (wd?: number[]) =>
    wd && wd.length > 0 ? wd.map((d) => WEEKDAY_LABELS[d]).join(", ") : null;

  return (
    <AppLayout
      title="Limpeza"
      subtitle="Rotina por frequência · gera tarefas automáticas no dia certo"
      action={
        !form && (
          <Button size="sm" onClick={startNew}>
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        )
      }
    >
      <VidaNav />

      {form && (
        <Card className="p-4 mb-4 border-accent/40 space-y-3">
          <div className="grid sm:grid-cols-3 gap-2">
            <Input
              placeholder="Tarefa (ex: Lavar roupas)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <Input
              placeholder="Área (cozinha, banheiro...)"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            />
            <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQ.map((f) => (
                  <SelectItem key={f.v} value={f.v}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Dias da semana (vira tarefa nesses dias automaticamente)
            </label>
            <WeekdayPicker
              value={form.weekdays}
              onChange={(weekdays) => setForm({ ...form, weekdays })}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3" />
                Horário sugerido (opcional)
              </label>
              <Input
                type="time"
                value={form.time_of_day}
                onChange={(e) => setForm({ ...form, time_of_day: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações</label>
              <Input
                placeholder="Detalhes (opcional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={save} disabled={upsert.isPending}>
              {form.id ? "Atualizar" : "Salvar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            {form.id && (
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-destructive hover:text-destructive"
                onClick={() => {
                  del.mutate(form.id);
                  setForm(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remover
              </Button>
            )}
          </div>
        </Card>
      )}

      {Object.keys(grouped).length === 0 && !form && (
        <p className="text-sm text-muted-foreground text-center py-12">
          Adicione sua primeira tarefa de limpeza.
        </p>
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
                const wd = weekdaysSummary(t.weekdays);
                return (
                  <Card
                    key={t.id}
                    className={`p-3 border-border/60 group cursor-pointer hover:border-accent/40 transition-colors ${
                      pending ? "" : "opacity-60"
                    }`}
                    onClick={() => startEdit(t)}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          log.mutate(t.id);
                        }}
                      >
                        <CheckCircle2
                          className={`h-4 w-4 ${pending ? "text-muted-foreground hover:text-accent" : "text-accent"}`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <span>{FREQ.find((f) => f.v === t.frequency)?.label}</span>
                          {wd && (
                            <>
                              <span>·</span>
                              <span className="text-accent">{wd}</span>
                            </>
                          )}
                          {t.time_of_day && (
                            <>
                              <span>·</span>
                              <span>{t.time_of_day.slice(0, 5)}</span>
                            </>
                          )}
                          {t.last_done && (
                            <>
                              <span>·</span>
                              <span>última {new Date(t.last_done).toLocaleDateString("pt-BR")}</span>
                            </>
                          )}
                        </p>
                      </div>
                      {pending && (
                        <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Pendente</span>
                      )}
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
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
