import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputWithMic } from "@/components/ui/input-with-mic";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TextareaWithMic } from "@/components/ui/textarea-with-mic";
import { TaskFormDrawer } from "@/components/forms/TaskFormDrawer";
import { ContentTodayCard } from "@/components/foco/ContentTodayCard";
import { SessionFormDrawer } from "@/components/psicoterapia/SessionFormDrawer";
import { useTasks, useUpsertTask } from "@/hooks/useData";
import { useDailyPlan, useEvents, useUpsertDailyPlan, useUpsertEvent } from "@/hooks/usePlanner";
import { usePatients, useTherapySessions } from "@/hooks/usePsicoterapia";
import { useScope, defaultScope, filterByScope } from "@/contexts/ScopeContext";
import { addDaysISO, formatDateLong, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowRight, CalendarPlus, ChevronLeft, ChevronRight, Clock, GripVertical, Lightbulb, Plus, Sparkle, X } from "lucide-react";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
const priorityRank: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
const priorityLabels: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

type DailyMeta = {
  focus?: string;
  intention?: string;
  tomorrow?: string;
};

type ParsedBullet = { text: string; kind: "tarefa" | "decisão" | "pendência"; priority: "alta" | "media" | "baixa" };

const normalizeText = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function parsePlanning(text: string): ParsedBullet[] {
  return text
    .split(/\n|;|\. /)
    .map((line) => line.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter((line) => line.length > 3)
    .map((line) => {
      const n = normalizeText(line);
      const kind = n.includes("decidir") || n.includes("decisao") || n.includes("definir")
        ? "decisão"
        : n.includes("pendente") || n.includes("aguard") || n.includes("resolver")
        ? "pendência"
        : "tarefa";
      const priority = n.includes("urgente") || n.includes("importante") || n.includes("hoje") || n.includes("preciso") ? "alta" : kind === "pendência" ? "media" : "baixa";
      return { text: line, kind, priority };
    });
}

function structureAsBullets(text: string) {
  const bullets = parsePlanning(text);
  return bullets.length ? bullets.map((bullet) => `• ${bullet.text}`).join("\n") : text;
}

function getDailyMeta(plan: any): DailyMeta {
  const value = plan?.top_priorities;
  if (value && !Array.isArray(value) && typeof value === "object") return value as DailyMeta;
  if (Array.isArray(value)) return { focus: value[0] ?? "" };
  return { focus: "", intention: "" };
}

export default function PlannerDiario() {
  const [date, setDate] = useState(todayISO());
  const [taskOpen, setTaskOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [quickTask, setQuickTask] = useState("");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("09:00");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [draft, setDraft] = useState({ focus: "", intention: "", planning: "", notes: "", tomorrow: "" });
  const [hasUserEditedPlan, setHasUserEditedPlan] = useState(false);
  const focusInputRef = useRef<HTMLInputElement>(null);

  const { scope } = useScope();
  const { data: plan } = useDailyPlan(date);
  const { data: tasksAll = [] } = useTasks();
  const { data: eventsAll = [] } = useEvents(date, date);
  const { data: sessions = [] } = useTherapySessions({ from: date, to: date });
  const { data: patients = [] } = usePatients();
  const upsertPlan = useUpsertDailyPlan();
  const upsertTask = useUpsertTask();
  const upsertEvent = useUpsertEvent();

  const patientById = useMemo(() => Object.fromEntries((patients as any[]).map((p) => [p.id, p])), [patients]);
  const scopedTasks = filterByScope(tasksAll, scope).filter((task: any) => {
    if (task.due_date === date) return true;
    return task.status !== "concluida" && task.due_date && task.due_date < date;
  });
  const scopedEvents = filterByScope(eventsAll, scope);

  useEffect(() => {
    setDate(todayISO());
    window.requestAnimationFrame(() => focusInputRef.current?.focus());
  }, []);

  useEffect(() => {
    const meta = getDailyMeta(plan);
    const previousFocus = window.localStorage.getItem("planner:last-focus") ?? "";
    setDraft({
      focus: meta.focus || previousFocus,
      intention: meta.intention ?? "",
      tomorrow: meta.tomorrow ?? "",
      planning: plan?.notes_rich ?? "",
      notes: plan?.reflection ?? "",
    });
    setHasUserEditedPlan(false);
  }, [plan, date]);

  useEffect(() => {
    if (!hasUserEditedPlan) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem("planner:last-focus", draft.focus);
      savePlan();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, hasUserEditedPlan]);

  const orderedTasks = useMemo(() => {
    const orderMap = new Map(manualOrder.map((id, index) => [id, index]));
    return scopedTasks.slice().sort((a: any, b: any) => {
      const aManual = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
      const bManual = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
      return aManual - bManual || priorityRank[a.priority] - priorityRank[b.priority] || a.created_at.localeCompare(b.created_at);
    });
  }, [scopedTasks, manualOrder]);

  const openTasks = orderedTasks.filter((task: any) => task.status !== "concluida");
  const completedTasks = orderedTasks.filter((task: any) => task.status === "concluida");
  const completedCount = completedTasks.length;
  const topTaskIds = new Set(openTasks.slice(0, 3).map((task: any) => task.id));
  const planningBullets = useMemo(() => parsePlanning(draft.planning), [draft.planning]);
  const taskTitles = useMemo(() => new Set(scopedTasks.map((task: any) => normalizeText(task.title))), [scopedTasks]);
  const actionableBullets = planningBullets.filter((bullet) => !taskTitles.has(normalizeText(bullet.text)));
  const subtleSuggestions = actionableBullets.slice(0, 3);

  const agendaItems = useMemo(() => {
    const eventItems = scopedEvents.map((event: any) => ({
      id: `event-${event.id}`,
      time: event.start_time?.slice(0, 5) ?? null,
      title: event.title,
      meta: event.location || event.description || "Compromisso",
    }));
    const sessionItems = (sessions as any[]).map((session) => ({
      id: `session-${session.id}`,
      time: session.start_time?.slice(0, 5) ?? null,
      title: patientById[session.patient_id]?.name ?? "Sessão",
      meta: `Psicoterapia · ${session.status}`,
    }));
    return [...eventItems, ...sessionItems].sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
  }, [scopedEvents, sessions, patientById]);

  const savePlan = (patch: Partial<typeof draft> = {}) => {
    const next = { ...draft, ...patch };
    upsertPlan.mutate({
      id: plan?.id,
      date,
      top_priorities: { focus: next.focus, intention: next.intention, tomorrow: next.tomorrow },
      notes_rich: next.planning,
      reflection: next.notes,
    });
  };

  const updateDraft = (patch: Partial<typeof draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setHasUserEditedPlan(true);
  };

  const createQuickTask = async () => {
    if (!quickTask.trim()) return;
    await upsertTask.mutateAsync({
      title: quickTask.trim(),
      due_date: date,
      priority: "media",
      status: "pendente",
      scope: defaultScope(scope),
    });
    setQuickTask("");
  };

  const createTaskFromBullet = async (bullet: ParsedBullet, targetDate = date) => {
    if (taskTitles.has(normalizeText(bullet.text))) return;
    await upsertTask.mutateAsync({
      title: bullet.text,
      due_date: targetDate,
      priority: bullet.priority,
      status: "pendente",
      scope: defaultScope(scope),
      notes: draft.focus ? `Foco do dia: ${draft.focus}` : null,
    });
  };

  const createSuggestedTasks = async () => {
    for (const bullet of subtleSuggestions) await createTaskFromBullet(bullet);
  };

  const createTomorrowTasks = async () => {
    for (const bullet of parsePlanning(draft.tomorrow)) await createTaskFromBullet(bullet, addDaysISO(date, 1));
  };

  const moveIncompleteToTomorrow = () => {
    const nextLines = openTasks.map((task: any) => task.title);
    const existing = draft.tomorrow.split("\n").map((line) => normalizeText(line));
    const merged = [...draft.tomorrow.split("\n").filter(Boolean), ...nextLines.filter((line) => !existing.includes(normalizeText(line)))];
    updateDraft({ tomorrow: merged.map((line) => `• ${line.replace(/^[-•*\s]+/, "")}`).join("\n") });
  };

  const createEvent = async () => {
    if (!newEventTitle.trim()) return;
    await upsertEvent.mutateAsync({
      title: newEventTitle.trim(),
      date,
      start_time: newEventTime,
      scope: defaultScope(scope),
      all_day: false,
    });
    setNewEventTitle("");
  };

  const toggleTask = (task: any) => {
    const done = task.status !== "concluida";
    upsertTask.mutate({ ...task, status: done ? "concluida" : "pendente", completed_at: done ? new Date().toISOString() : null });
  };

  const updateTaskPriority = (task: any, priority: string) => {
    upsertTask.mutate({ ...task, priority });
  };

  const reorderTask = (targetId: string) => {
    if (!draggedTaskId || draggedTaskId === targetId) return;
    const ids = openTasks.map((task: any) => task.id);
    const from = ids.indexOf(draggedTaskId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setManualOrder(ids);
    setDraggedTaskId(null);
  };

  return (
    <AppLayout
      title="Planejamento"
      subtitle={formatDateLong(date)}
      action={
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setDate(addDaysISO(date, -1))} aria-label="Dia anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setDate(todayISO())}>Hoje</Button>
          <Button size="sm" variant="ghost" onClick={() => setDate(addDaysISO(date, 1))} aria-label="Próximo dia"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl space-y-5">
        <ContentTodayCard />

        <section className="sticky top-0 z-20 rounded-b-lg border border-t-0 border-border/70 bg-background/95 p-4 shadow-sm backdrop-blur">
          <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Foco do dia</span>
              <InputWithMic
                ref={focusInputRef}
                value={draft.focus}
                onValueChange={(value) => updateDraft({ focus: value })}
                placeholder="Qual é a prioridade central do seu dia?"
                className="h-11 border-0 bg-muted/40 text-base font-medium shadow-none focus-visible:ring-1"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Intenção</span>
              <InputWithMic
                value={draft.intention}
                onValueChange={(value) => updateDraft({ intention: value })}
                placeholder="Como você quer conduzir o dia?"
                className="h-11 border-0 bg-muted/40 shadow-none focus-visible:ring-1"
              />
            </label>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
          <main className="space-y-5">
            <Card className="border-border/70 p-5 shadow-none">
              <div className="mb-4">
                <h2 className="font-display text-2xl font-semibold">Planejamento de hoje</h2>
                <p className="text-sm text-muted-foreground">O que precisa acontecer hoje para o dia valer a pena?</p>
              </div>
              <TextareaWithMic
                value={draft.planning}
                onValueChange={(value) => updateDraft({ planning: value })}
                onBlur={() => updateDraft({ planning: structureAsBullets(draft.planning) })}
                placeholder="Escreva livremente: prioridades, decisões, pendências e próximos passos."
                className="min-h-[160px] resize-none border-0 bg-muted/30 text-base leading-relaxed shadow-none focus-visible:ring-1"
              />
              {planningBullets.length > 0 && (
                <div className="mt-4 space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Organizado em ação</div>
                    {subtleSuggestions.length > 0 && <Button size="sm" variant="ghost" onClick={createSuggestedTasks}>Criar {subtleSuggestions.length} tarefas</Button>}
                  </div>
                  {planningBullets.map((bullet, index) => {
                    const exists = taskTitles.has(normalizeText(bullet.text));
                    return (
                      <div key={`${bullet.text}-${index}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-background/60">
                        <span className="w-20 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{bullet.kind}</span>
                        <span className="min-w-0 flex-1 truncate">{bullet.text}</span>
                        {!exists && <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => createTaskFromBullet(bullet)}>Virar tarefa</Button>}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="border-border/70 p-5 shadow-none">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-semibold">Tarefas do dia</h2>
                  <p className="text-sm text-muted-foreground">Quais são as tarefas essenciais?</p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <div className="text-xs text-muted-foreground">Você concluiu {completedCount} {completedCount === 1 ? "tarefa" : "tarefas"} hoje</div>
                  <Button variant="outline" size="sm" onClick={() => setTaskOpen(true)}><Plus className="mr-2 h-4 w-4" />Adicionar tarefa</Button>
                </div>
              </div>

              <div className="mb-4 flex gap-2">
                <InputWithMic
                  value={quickTask}
                  onValueChange={setQuickTask}
                  onKeyDown={(e) => e.key === "Enter" && createQuickTask()}
                  placeholder="Adicionar tarefa rápida"
                  className="h-11"
                />
                <Button onClick={createQuickTask} className="h-11 px-4"><Plus className="h-4 w-4" /></Button>
              </div>

              {subtleSuggestions.length > 0 && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2"><Lightbulb className="h-4 w-4" /> {subtleSuggestions.length} próxima ação possível no planejamento</span>
                  <Button size="sm" variant="ghost" onClick={createSuggestedTasks}>Adicionar</Button>
                </div>
              )}

              <div className="space-y-2">
                {openTasks.length === 0 && <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">Nenhuma tarefa essencial para hoje.</div>}
                {openTasks.map((task: any) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    featured={topTaskIds.has(task.id) && openTasks.length >= 3}
                    subdued={completedCount > 0 && !topTaskIds.has(task.id)}
                    onToggle={() => toggleTask(task)}
                    onPriorityChange={(priority) => updateTaskPriority(task, priority)}
                    onDragStart={() => setDraggedTaskId(task.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => reorderTask(task.id)}
                  />
                ))}
              </div>

              {completedTasks.length > 0 && (
                <div className="mt-5 border-t border-border/60 pt-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Concluídas</div>
                  <div className="space-y-1 opacity-55 transition-opacity hover:opacity-100">
                    {completedTasks.map((task: any) => (
                      <button key={task.id} onClick={() => toggleTask(task)} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-muted/40">
                        <Checkbox checked className="pointer-events-none" />
                        <span className="line-through">{task.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="border-border/70 p-5 shadow-none">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold">Para amanhã</h2>
                  <p className="text-sm text-muted-foreground">Capture tarefas futuras sem encerrar o dia.</p>
                </div>
                <Button size="sm" variant="outline" onClick={moveIncompleteToTomorrow}><ArrowRight className="mr-2 h-4 w-4" />Mover abertas</Button>
              </div>
              <TextareaWithMic
                value={draft.tomorrow}
                onValueChange={(value) => updateDraft({ tomorrow: value })}
                onBlur={() => updateDraft({ tomorrow: structureAsBullets(draft.tomorrow) })}
                placeholder="O que pode ficar para amanhã?"
                className="min-h-[96px] resize-none border-0 bg-muted/25 shadow-none focus-visible:ring-1"
              />
              {draft.tomorrow.trim() && <Button size="sm" variant="ghost" className="mt-3" onClick={createTomorrowTasks}>Criar tarefas para amanhã</Button>}
            </Card>
          </main>

          <aside className="space-y-5">
            <Card className={cn("border-border/70 p-5 shadow-none transition-opacity", completedCount > 0 && "opacity-75")}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold">Agenda</h2>
                  <p className="text-sm text-muted-foreground">Horários do dia</p>
                </div>
                <Button size="icon" variant="outline" onClick={() => setSessionOpen(true)} aria-label="Adicionar sessão"><CalendarPlus className="h-4 w-4" /></Button>
              </div>

              <div className="mb-4 grid grid-cols-[88px_1fr_auto] gap-2">
                <Input type="time" value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} className="h-10" />
                <Input value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createEvent()} placeholder="Compromisso" className="h-10" />
                <Button size="icon" variant="outline" onClick={createEvent}><Plus className="h-4 w-4" /></Button>
              </div>

              <div className="space-y-0">
                {HOURS.map((hour) => {
                  const label = `${String(hour).padStart(2, "0")}:00`;
                  const items = agendaItems.filter((item) => item.time?.slice(0, 2) === String(hour).padStart(2, "0"));
                  return (
                    <div key={hour} className="grid min-h-12 grid-cols-[56px_1fr] border-t border-border/60 py-2 first:border-t-0">
                      <div className="pt-1 text-xs tabular-nums text-muted-foreground">{label}</div>
                      <div className="space-y-2">
                        {items.map((item) => <AgendaBlock key={item.id} item={item} />)}
                      </div>
                    </div>
                  );
                })}
                {agendaItems.some((item) => !item.time) && (
                  <div className="grid min-h-12 grid-cols-[56px_1fr] border-t border-border/60 py-2">
                    <div className="pt-1 text-xs text-muted-foreground">Livre</div>
                    <div className="space-y-2">{agendaItems.filter((item) => !item.time).map((item) => <AgendaBlock key={item.id} item={item} />)}</div>
                  </div>
                )}
              </div>
            </Card>
          </aside>
        </section>

        <Card className="border-border/60 p-4 shadow-none">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkle className="h-4 w-4" /> Anotações rápidas
          </div>
          <TextareaWithMic
            value={draft.notes}
            onValueChange={(value) => updateDraft({ notes: value })}
            placeholder="Registre algo importante sem estruturar demais."
            className={cn("min-h-[92px] resize-none border-0 bg-muted/25 shadow-none transition-opacity focus-visible:ring-1", completedCount > 0 && "opacity-75")}
          />
        </Card>
      </div>

      <TaskFormDrawer open={taskOpen} onOpenChange={setTaskOpen} task={null} defaultDate={date} />
      <SessionFormDrawer open={sessionOpen} onOpenChange={setSessionOpen} session={null} defaultDate={date} />
    </AppLayout>
  );
}

function TaskRow({
  task,
  featured,
  subdued,
  onToggle,
  onPriorityChange,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  task: any;
  featured?: boolean;
  subdued?: boolean;
  onToggle: () => void;
  onPriorityChange: (priority: string) => void;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: () => void;
}) {
  const isHigh = task.priority === "alta";
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "group flex items-center gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:bg-muted/25",
        isHigh && "border-primary/40 bg-primary/5",
        featured && "ring-1 ring-primary/30",
        subdued && "opacity-70 hover:opacity-100",
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground opacity-45 group-hover:opacity-100" />
      <Checkbox checked={false} onCheckedChange={onToggle} aria-label="Concluir tarefa" />
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm font-medium", isHigh && "text-primary")}>{task.title}</div>
        {task.notes && <div className="mt-0.5 truncate text-xs text-muted-foreground">{task.notes}</div>}
      </div>
      <Select value={task.priority ?? "media"} onValueChange={onPriorityChange}>
        <SelectTrigger className="h-8 w-[104px] border-0 bg-muted/50 text-xs shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="alta">{priorityLabels.alta}</SelectItem>
          <SelectItem value="media">{priorityLabels.media}</SelectItem>
          <SelectItem value="baixa">{priorityLabels.baixa}</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100" onClick={onToggle} aria-label="Remover da lista do dia">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AgendaBlock({ item }: { item: { time: string | null; title: string; meta: string } }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/25 px-3 py-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="truncate">{item.title}</span>
      </div>
      <div className="mt-0.5 truncate text-xs text-muted-foreground">{item.meta}</div>
    </div>
  );
}
