import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PlannerNav } from "@/components/planner/PlannerNav";
import { PencilTabs } from "@/components/planner/PencilTabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScopeBadge } from "@/components/ScopeBadge";
import { TaskFormDrawer } from "@/components/forms/TaskFormDrawer";
import { useTasks, useUpsertTask } from "@/hooks/useData";
import { useDailyPlan, useUpsertDailyPlan, useEvents, useUpsertEvent, useDeleteEvent } from "@/hooks/usePlanner";
import { todayISO, addDaysISO, formatDateLong } from "@/lib/format";
import { useScope, filterByScope, defaultScope } from "@/contexts/ScopeContext";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Plus, Clock, Trash2, Calendar as CalIcon } from "lucide-react";

export default function PlannerDiario() {
  const [date, setDate] = useState<string>(todayISO());
  const { scope } = useScope();
  const { data: plan } = useDailyPlan(date);
  const upsertPlan = useUpsertDailyPlan();
  const { data: tasksAll = [] } = useTasks();
  const upsertTask = useUpsertTask();
  const { data: eventsAll = [] } = useEvents(date, date);
  const upsertEvent = useUpsertEvent();
  const deleteEvent = useDeleteEvent();

  const [priorities, setPriorities] = useState<string[]>(["", "", ""]);
  const [reflection, setReflection] = useState("");
  const [notesRich, setNotesRich] = useState("");
  const [notesDraw, setNotesDraw] = useState<string | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", start_time: "", end_time: "", location: "" });

  useEffect(() => {
    if (plan) {
      const p = (plan.top_priorities as string[]) || [];
      setPriorities([p[0] || "", p[1] || "", p[2] || ""]);
      setReflection(plan.reflection || "");
      setNotesRich(plan.notes_rich || "");
      setNotesDraw(plan.notes_drawing || null);
    } else {
      setPriorities(["", "", ""]);
      setReflection("");
      setNotesRich("");
      setNotesDraw(null);
    }
  }, [plan, date]);

  const savePlan = (patch: Partial<any> = {}) => {
    upsertPlan.mutate({
      date,
      top_priorities: priorities,
      reflection,
      notes_rich: notesRich,
      notes_drawing: notesDraw,
      ...patch,
    });
  };

  const tasks = filterByScope(tasksAll, scope);
  const events = filterByScope(eventsAll, scope);
  const dayTasks = tasks.filter((t: any) => t.due_date === date);
  const toggleTask = (t: any) => {
    const newStatus = t.status === "concluida" ? "pendente" : "concluida";
    upsertTask.mutate({ ...t, status: newStatus, completed_at: newStatus === "concluida" ? new Date().toISOString() : null });
  };

  const addEvent = () => {
    if (!eventForm.title.trim()) return;
    upsertEvent.mutate({ ...eventForm, date, scope: defaultScope(scope) });
    setEventForm({ title: "", start_time: "", end_time: "", location: "" });
  };

  return (
    <AppLayout
      title="Planner"
      subtitle={formatDateLong(date)}
      action={
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setDate(addDaysISO(date, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setDate(todayISO())}>Hoje</Button>
          <Button size="sm" variant="ghost" onClick={() => setDate(addDaysISO(date, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      }
    >
      <PlannerNav />

      {/* Top 3 prioridades */}
      <Card className="p-5 mb-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold mb-3">3 Prioridades do dia</h2>
        <div className="space-y-2">
          {priorities.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="font-display text-2xl text-accent w-6">{i + 1}</span>
              <Input
                value={p}
                onChange={(e) => {
                  const next = [...priorities];
                  next[i] = e.target.value;
                  setPriorities(next);
                }}
                onBlur={() => savePlan()}
                placeholder={`Prioridade ${i + 1}`}
                className="border-0 border-b border-border rounded-none focus-visible:ring-0 focus-visible:border-accent"
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Tarefas do dia */}
        <Card className="p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Tarefas</h2>
            <Button size="sm" variant="ghost" onClick={() => setTaskOpen(true)}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1">
            {dayTasks.length === 0 && <p className="text-sm text-muted-foreground">Sem tarefas para este dia.</p>}
            {dayTasks.map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 py-1.5 group">
                <button onClick={() => toggleTask(t)}>
                  {t.status === "concluida"
                    ? <CheckCircle2 className="h-4 w-4 text-accent" />
                    : <Circle className="h-4 w-4 text-muted-foreground" />}
                </button>
                <span className={`text-sm flex-1 ${t.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                <ScopeBadge scope={t.scope} />
              </div>
            ))}
          </div>
        </Card>

        {/* Agenda do dia */}
        <Card className="p-5 shadow-soft">
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <CalIcon className="h-4 w-4" /> Agenda
          </h2>
          <div className="space-y-1 mb-3">
            {events.length === 0 && <p className="text-sm text-muted-foreground">Sem eventos.</p>}
            {events.map((e: any) => (
              <div key={e.id} className="flex items-center gap-2 py-1.5 group">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs tabular-nums text-muted-foreground w-24">
                  {e.start_time?.slice(0, 5) || "—"}{e.end_time ? ` – ${e.end_time.slice(0, 5)}` : ""}
                </span>
                <span className="text-sm flex-1 truncate">{e.title}</span>
                {e.location && <span className="text-xs text-muted-foreground hidden sm:inline">· {e.location}</span>}
                <ScopeBadge scope={e.scope} />
                <button
                  onClick={() => deleteEvent.mutate(e.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_80px_80px_auto] gap-2 items-center">
            <Input
              placeholder="Novo evento"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && addEvent()}
            />
            <Input type="time" value={eventForm.start_time} onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })} />
            <Input type="time" value={eventForm.end_time} onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })} />
            <Button size="sm" onClick={addEvent}><Plus className="h-4 w-4" /></Button>
          </div>
        </Card>
      </div>

      {/* Notas livres do dia (texto + desenho) */}
      <Card className="p-5 mb-6 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Notas do dia</h2>
          <Button size="sm" variant="ghost" onClick={() => savePlan()}>Salvar</Button>
        </div>
        <PencilTabs
          textValue={notesRich}
          drawingValue={notesDraw}
          onTextChange={(v) => { setNotesRich(v); }}
          onDrawingChange={(v) => { setNotesDraw(v); savePlan({ notes_drawing: v }); }}
          textPlaceholder="Pensamentos, ideias, anotações..."
          drawingHeight={400}
        />
        <p className="text-xs text-muted-foreground mt-2">As notas em texto salvam ao clicar em "Salvar". O desenho salva automaticamente.</p>
      </Card>

      {/* Reflexão */}
      <Card className="p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold mb-3">Como foi o dia?</h2>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          onBlur={() => savePlan()}
          placeholder="Uma linha sobre o dia..."
          className="w-full border-0 border-b border-border rounded-none focus-visible:ring-0 focus-visible:border-accent bg-transparent resize-none text-sm py-2"
          rows={2}
        />
      </Card>

      <TaskFormDrawer open={taskOpen} onOpenChange={setTaskOpen} task={null} defaultDate={date} />
    </AppLayout>
  );
}
