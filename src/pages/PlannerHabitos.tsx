import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PlannerNav } from "@/components/planner/PlannerNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useHabits, useHabitLogs, useUpsertHabit, useDeleteHabit, useToggleHabitLog } from "@/hooks/usePlanner";
import { useGoals } from "@/hooks/useData";
import { startOfWeekFor, weekDates, dayName, dayNumber, isToday } from "@/lib/week";
import { todayISO, addDaysISO } from "@/lib/format";
import { Plus, Check, Flame, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

export default function PlannerHabitos() {
  const [weekStart, setWeekStart] = useState<string>(startOfWeekFor(todayISO()));
  const days = weekDates(weekStart);
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useHabitLogs(addDaysISO(weekStart, -60), days[6]);
  const toggle = useToggleHabitLog();
  const upsert = useUpsertHabit();
  const del = useDeleteHabit();
  const { data: goals = [] } = useGoals();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const consistency = useMemo(() => {
    const map: Record<string, number> = {};
    for (const h of habits) {
      const last30 = logs.filter((l: any) => l.habit_id === h.id && l.date >= addDaysISO(todayISO(), -29) && l.date <= todayISO());
      map[h.id] = Math.round((last30.length / 30) * 100);
    }
    return map;
  }, [habits, logs]);

  const streak = (habitId: string): number => {
    let s = 0;
    let cur = todayISO();
    const set = new Set(logs.filter((l: any) => l.habit_id === habitId).map((l: any) => l.date));
    while (set.has(cur)) {
      s++;
      cur = addDaysISO(cur, -1);
    }
    return s;
  };

  const isDone = (habitId: string, date: string) =>
    logs.some((l: any) => l.habit_id === habitId && l.date === date);

  const openNew = () => { setEditing({ name: "", scope: "pessoal", frequency: "diaria" }); setOpen(true); };
  const openEdit = (h: any) => { setEditing(h); setOpen(true); };

  return (
    <AppLayout
      title="Hábitos"
      subtitle="Pequenas ações, grandes resultados"
      action={<Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Hábito</Button>}
    >
      <PlannerNav />

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          Semana de {new Date(weekStart + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(addDaysISO(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeekFor(todayISO()))}>Hoje</Button>
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(addDaysISO(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {habits.length === 0 ? (
        <Card className="p-10 text-center shadow-soft">
          <p className="text-muted-foreground mb-4">Nenhum hábito ainda.</p>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Criar primeiro hábito</Button>
        </Card>
      ) : (
        <Card className="shadow-soft overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium min-w-[180px]">Hábito</th>
                {days.map((d) => (
                  <th key={d} className={`px-1 py-2 text-center font-medium ${isToday(d) ? "text-accent" : ""}`}>
                    <div className="text-[10px] uppercase">{dayName(d)}</div>
                    <div className="font-display text-base">{dayNumber(d)}</div>
                  </th>
                ))}
                <th className="text-center px-3 py-2 font-medium">Streak</th>
                <th className="text-center px-3 py-2 font-medium">30d</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {habits.map((h: any) => (
                <tr key={h.id} className="hover:bg-muted/20 group">
                  <td className="px-4 py-2">
                    <button onClick={() => openEdit(h)} className="text-left">
                      <div className="font-medium">{h.name}</div>
                      {h.target_value && <div className="text-xs text-muted-foreground">Meta: {h.target_value} {h.unit || ""}</div>}
                    </button>
                  </td>
                  {days.map((d) => {
                    const done = isDone(h.id, d);
                    const future = d > todayISO();
                    return (
                      <td key={d} className="px-1 py-2 text-center">
                        <button
                          onClick={() => !future && toggle.mutate({ habit_id: h.id, date: d })}
                          disabled={future}
                          className={`h-8 w-8 rounded-full border transition-colors flex items-center justify-center mx-auto ${
                            done
                              ? "bg-accent border-accent text-accent-foreground"
                              : future
                                ? "border-border/30 cursor-not-allowed"
                                : "border-border hover:border-accent"
                          }`}
                        >
                          {done && <Check className="h-4 w-4" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    <div className="inline-flex items-center gap-1 text-sm">
                      <Flame className="h-3.5 w-3.5 text-warning" />
                      <span className="tabular-nums font-medium">{streak(h.id)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums text-sm">{consistency[h.id] || 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <HabitDrawer
        open={open}
        onOpenChange={setOpen}
        habit={editing}
        goals={goals}
        onSave={(h) => { upsert.mutate(h); setOpen(false); }}
        onDelete={(id) => { del.mutate(id); setOpen(false); }}
      />
    </AppLayout>
  );
}

function HabitDrawer({ open, onOpenChange, habit, goals, onSave, onDelete }: any) {
  const [form, setForm] = useState<any>(habit || {});
  // sync when habit changes
  useMemo(() => setForm(habit || {}), [habit]);

  if (!habit) return null;
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{form.id ? "Editar hábito" : "Novo hábito"}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4 max-w-2xl mx-auto w-full">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome</label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Beber 2L de água" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Escopo</label>
              <Select value={form.scope || "pessoal"} onValueChange={(v) => setForm({ ...form, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                  <SelectItem value="profissional">Profissional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Frequência</label>
              <Select value={form.frequency || "diaria"} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Meta quantitativa (opcional)</label>
              <Input
                type="number"
                value={form.target_value ?? ""}
                onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                placeholder="Ex: 2"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Unidade</label>
              <Input value={form.unit || ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Ex: L, min, pag" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Vincular à meta (opcional)</label>
            <Select
              value={form.goal_id || "none"}
              onValueChange={(v) => setForm({ ...form, goal_id: v === "none" ? null : v })}
            >
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {goals.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DrawerFooter className="max-w-2xl mx-auto w-full">
          <div className="flex gap-2">
            {form.id && (
              <Button variant="ghost" onClick={() => onDelete(form.id)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-1" /> Arquivar
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={() => onSave(form)} disabled={!form.name?.trim()}>Salvar</Button>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
