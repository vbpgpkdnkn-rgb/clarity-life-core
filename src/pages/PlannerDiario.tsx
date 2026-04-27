import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TaskFormDrawer } from "@/components/forms/TaskFormDrawer";
import { SessionFormDrawer } from "@/components/psicoterapia/SessionFormDrawer";
import { SessionAnalysisDrawer } from "@/components/psicoterapia/SessionAnalysisDrawer";
import { useContentPieces, useUpsertPiece } from "@/hooks/useContent";
import { useTasks, useUpsertTask } from "@/hooks/useData";
import { useDailyPlan, useEvents } from "@/hooks/usePlanner";
import { usePatients, useTherapySessions, useUpsertTherapySession } from "@/hooks/usePsicoterapia";
import { useScope, defaultScope, filterByScope } from "@/contexts/ScopeContext";
import { addDaysISO, formatDateLong, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  FileCheck2,
  Flame,
  ListPlus,
  Mic,
  Pause,
  Play,
  Plus,
  Sparkles,
  Target,
  TimerReset,
  Trash2,
} from "lucide-react";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
const POMODORO_SECONDS = 25 * 60;

type TimelineKind = "task" | "session" | "content" | "event";
type TimelineItem = {
  id: string;
  kind: TimelineKind;
  title: string;
  time?: string | null;
  priority: "alta" | "media" | "baixa";
  status?: string;
  raw: any;
};

const priorityMeta = {
  alta: { label: "MUST DO", icon: Flame, className: "text-destructive" },
  media: { label: "IMPORTANT", icon: Target, className: "text-warning" },
  baixa: { label: "OPTIONAL", icon: Circle, className: "text-muted-foreground" },
};

const priorityRank = { alta: 0, media: 1, baixa: 2 };

function secondsLabel(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function PlannerDiario() {
  const [date, setDate] = useState(todayISO());
  const [focusMode, setFocusMode] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [analysisPatient, setAnalysisPatient] = useState<{ id: string; name: string } | null>(null);
  const [hiddenCompleted, setHiddenCompleted] = useState<string[]>([]);
  const [quickTask, setQuickTask] = useState("");
  const [bossOpen, setBossOpen] = useState(false);
  const [startTask, setStartTask] = useState<any>(null);
  const [customPrep, setCustomPrep] = useState("15");
  const [prepSeconds, setPrepSeconds] = useState<number | null>(null);
  const [pomoTask, setPomoTask] = useState<any>(null);
  const [pomoSeconds, setPomoSeconds] = useState(POMODORO_SECONDS);
  const [nextTask, setNextTask] = useState<any>(null);

  const { scope } = useScope();
  const { data: plan } = useDailyPlan(date);
  const { data: tasksAll = [] } = useTasks();
  const { data: sessions = [] } = useTherapySessions({ from: date, to: date });
  const { data: patients = [] } = usePatients();
  const { data: pieces = [] } = useContentPieces();
  const { data: eventsAll = [] } = useEvents(date, date);
  const upsertTask = useUpsertTask();
  const upsertSession = useUpsertTherapySession();
  const upsertPiece = useUpsertPiece();

  const patientById = useMemo(() => Object.fromEntries((patients as any[]).map((p) => [p.id, p])), [patients]);
  const tasks = filterByScope(tasksAll, scope).filter((t: any) => t.due_date === date && !hiddenCompleted.includes(t.id));
  const events = filterByScope(eventsAll, scope);

  const orderedTasks = useMemo(
    () => tasks.slice().sort((a: any, b: any) => priorityRank[a.priority] - priorityRank[b.priority] || a.title.localeCompare(b.title)),
    [tasks],
  );

  const activeTasks = orderedTasks.filter((t: any) => t.status !== "concluida");
  const focusTask = activeTasks[0] ?? null;
  const secondTask = activeTasks[1] ?? null;

  const contentToday = (pieces as any[]).filter((p) => {
    const planned = p.planned_date;
    const target = p.target_publish_at?.slice(0, 10);
    return planned === date || target === date;
  });

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const taskItems = orderedTasks.map((t: any) => ({
      id: `task-${t.id}`,
      kind: "task" as const,
      title: t.title,
      time: null,
      priority: t.priority ?? "media",
      status: t.status,
      raw: t,
    }));

    const sessionItems = (sessions as any[]).map((s) => ({
      id: `session-${s.id}`,
      kind: "session" as const,
      title: patientById[s.patient_id]?.name ?? "Paciente",
      time: s.start_time,
      priority: "alta" as const,
      status: s.status,
      raw: s,
    }));

    const contentItems = contentToday.map((p: any) => ({
      id: `content-${p.id}`,
      kind: "content" as const,
      title: p.title,
      time: p.target_publish_at?.slice(11, 16) ?? null,
      priority: p.priority ?? "media",
      status: p.pipeline_stage ?? p.status,
      raw: p,
    }));

    const eventItems = events.map((e: any) => ({
      id: `event-${e.id}`,
      kind: "event" as const,
      title: e.title,
      time: e.start_time,
      priority: "baixa" as const,
      status: e.location,
      raw: e,
    }));

    const items = [...sessionItems, ...contentItems, ...eventItems, ...taskItems].sort((a, b) => {
      const ta = a.time?.slice(0, 5) ?? "99:99";
      const tb = b.time?.slice(0, 5) ?? "99:99";
      return ta.localeCompare(tb) || priorityRank[a.priority] - priorityRank[b.priority];
    });

    if (!focusMode) return items;
    const allowed = new Set([focusTask?.id, secondTask?.id].filter(Boolean).map((id) => `task-${id}`));
    return items.filter((item) => allowed.has(item.id));
  }, [orderedTasks, sessions, patientById, contentToday, events, focusMode, focusTask?.id, secondTask?.id]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const h of HOURS) map.set(String(h).padStart(2, "0"), []);
    map.set("Sem horário", []);
    timelineItems.forEach((item) => {
      const hour = item.time?.slice(0, 2);
      const key = hour && map.has(hour) ? hour : "Sem horário";
      map.get(key)?.push(item);
    });
    return map;
  }, [timelineItems]);

  useEffect(() => {
    if (prepSeconds === null) return;
    if (prepSeconds <= 0) {
      setPrepSeconds(null);
      if (startTask) {
        setPomoTask(startTask);
        setPomoSeconds(POMODORO_SECONDS);
        upsertTask.mutate({ ...startTask, status: "em_andamento" });
        setStartTask(null);
      }
      return;
    }
    const timer = window.setTimeout(() => setPrepSeconds((s) => (s ?? 1) - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [prepSeconds, startTask]);

  useEffect(() => {
    if (!pomoTask) return;
    if (pomoSeconds <= 0) {
      upsertTask.mutate({ ...pomoTask, status: "concluida", completed_at: new Date().toISOString() });
      const upcoming = activeTasks.find((t: any) => t.id !== pomoTask.id);
      setNextTask(upcoming ?? null);
      setPomoTask(null);
      setPomoSeconds(POMODORO_SECONDS);
      return;
    }
    const timer = window.setTimeout(() => setPomoSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [pomoSeconds, pomoTask, activeTasks]);

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

  const toggleTask = (task: any) => {
    const done = task.status !== "concluida";
    upsertTask.mutate({ ...task, status: done ? "concluida" : "pendente", completed_at: done ? new Date().toISOString() : null });
  };

  const clearCompleted = () => {
    setHiddenCompleted((prev) => [...new Set([...prev, ...tasks.filter((t: any) => t.status === "concluida").map((t: any) => t.id)])]);
  };

  const startPrep = (seconds: number) => {
    setPrepSeconds(seconds);
  };

  const startNext = () => {
    if (!nextTask) return;
    setStartTask(nextTask);
    setNextTask(null);
  };

  const openSession = (session: any) => {
    setEditingSession(session);
    setSessionOpen(true);
  };

  const markSessionDone = (session: any) => upsertSession.mutate({ ...session, status: "realizada" });
  const toggleChart = (session: any) => upsertSession.mutate({ ...session, chart_updated: !session.chart_updated });

  const kindIcon = (kind: TimelineKind) => {
    if (kind === "session") return <Brain className="h-4 w-4" />;
    if (kind === "content") return <CalendarDays className="h-4 w-4" />;
    if (kind === "event") return <Clock className="h-4 w-4" />;
    return <CheckCircle2 className="h-4 w-4" />;
  };

  return (
    <AppLayout
      title="Planner"
      subtitle={formatDateLong(date)}
      action={
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setDate(addDaysISO(date, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setDate(todayISO())}>Today</Button>
          <Button size="sm" variant="ghost" onClick={() => setDate(addDaysISO(date, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearCompleted}><Trash2 className="h-4 w-4 mr-1" />Clear completed</Button>
            <Button variant="outline" size="sm" onClick={() => setBossOpen(true)}><Sparkles className="h-4 w-4 mr-1" />Boss</Button>
            <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <Switch checked={focusMode} onCheckedChange={setFocusMode} /> Focus mode
            </label>
          </div>
          <div className="flex items-center gap-2 min-w-0 sm:w-[360px]">
            <Input
              value={quickTask}
              onChange={(e) => setQuickTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createQuickTask()}
              placeholder="Add task for today"
            />
            <Button size="icon" onClick={createQuickTask}><Plus className="h-4 w-4" /></Button>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div className="space-y-5">
            <Card className="p-5 border-border/60 shadow-none">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Focus of the day</div>
              {focusTask ? (
                <div className="space-y-4">
                  <div>
                    <PriorityPill priority={focusTask.priority} />
                    <h2 className="font-display text-2xl font-semibold mt-3 leading-tight">{focusTask.title}</h2>
                    {focusTask.notes && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{focusTask.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => setStartTask(focusTask)}><Play className="h-4 w-4 mr-2" />Start now</Button>
                    <Button variant="outline" size="icon" onClick={() => toggleTask(focusTask)}><CheckCircle2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-sm text-muted-foreground">No active task for today.</div>
              )}
            </Card>

            {pomoTask && (
              <Card className="p-5 border-primary/30 bg-primary/5 shadow-none">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Pomodoro</div>
                <div className="font-display text-4xl font-semibold tabular-nums mt-2">{secondsLabel(pomoSeconds)}</div>
                <p className="text-sm mt-2 line-clamp-2">{pomoTask.title}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setPomoTask(null)}><Pause className="h-4 w-4 mr-1" />Pause</Button>
              </Card>
            )}

            <Button variant="outline" className="w-full" onClick={() => setTaskOpen(true)}><Plus className="h-4 w-4 mr-2" />New task</Button>
          </div>

          <Card className="p-0 border-border/60 shadow-none overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">Daily timeline</h2>
                <p className="text-sm text-muted-foreground">Tasks, sessions and content in one view.</p>
              </div>
              <div className="text-sm text-muted-foreground tabular-nums">{timelineItems.length} items</div>
            </div>
            <div className="divide-y divide-border">
              {[...grouped.entries()].map(([hour, items]) => {
                if (items.length === 0 && hour === "Sem horário") return null;
                return (
                  <div key={hour} className="grid grid-cols-[72px_1fr] sm:grid-cols-[88px_1fr] min-h-16">
                    <div className="px-4 py-4 text-xs tabular-nums text-muted-foreground border-r border-border">
                      {hour === "Sem horário" ? hour : `${hour}:00`}
                    </div>
                    <div className="p-3 space-y-2">
                      {items.length === 0 ? <div className="h-7" /> : items.map((item) => (
                        <TimelineRow
                          key={item.id}
                          item={item}
                          expanded={expanded === item.id}
                          onExpand={() => setExpanded(expanded === item.id ? null : item.id)}
                          onToggleTask={toggleTask}
                          onStartTask={(task) => setStartTask(task)}
                          onOpenSession={openSession}
                          onMarkSessionDone={markSessionDone}
                          onToggleChart={toggleChart}
                          onAnalyze={(patientId) => setAnalysisPatient({ id: patientId, name: patientById[patientId]?.name ?? "Paciente" })}
                          onUpdateContent={(piece) => upsertPiece.mutate(piece)}
                          icon={kindIcon(item.kind)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      </div>

      <TaskFormDrawer open={taskOpen} onOpenChange={setTaskOpen} task={null} defaultDate={date} />
      <SessionFormDrawer open={sessionOpen} onOpenChange={setSessionOpen} session={editingSession} defaultDate={date} />
      {analysisPatient && (
        <SessionAnalysisDrawer
          open={!!analysisPatient}
          onOpenChange={(v) => !v && setAnalysisPatient(null)}
          patientId={analysisPatient.id}
          patientName={analysisPatient.name}
          kind="single"
        />
      )}

      <Dialog open={!!startTask} onOpenChange={(open) => !open && setStartTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How long do you need to start?</DialogTitle>
            <DialogDescription>{startTask?.title}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => startPrep(0)}>Now</Button>
            <Button variant="outline" onClick={() => startPrep(5 * 60)}>5 min</Button>
            <Button variant="outline" onClick={() => startPrep(10 * 60)}>10 min</Button>
          </div>
          <div className="flex gap-2">
            <Input type="number" min="1" value={customPrep} onChange={(e) => setCustomPrep(e.target.value)} />
            <Button variant="outline" onClick={() => startPrep(Math.max(1, Number(customPrep) || 1) * 60)}>Custom</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={prepSeconds !== null} onOpenChange={(open) => !open && setPrepSeconds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Starting in</DialogTitle>
          </DialogHeader>
          <div className="font-display text-6xl font-semibold tabular-nums text-center py-8">{secondsLabel(prepSeconds ?? 0)}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!nextTask} onOpenChange={(open) => !open && setNextTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task completed</DialogTitle>
            <DialogDescription>{nextTask ? `Next: ${nextTask.title}` : "No next task."}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={startNext}><TimerReset className="h-4 w-4 mr-2" />Start next</Button>
            <Button variant="outline" className="flex-1" onClick={() => setNextTask(null)}>Pause</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bossOpen} onOpenChange={setBossOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Boss view</DialogTitle>
            <DialogDescription>Strategic guidance opens only when requested.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="What decision or bottleneck needs executive attention?" />
          <Button onClick={() => setBossOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function PriorityPill({ priority }: { priority: "alta" | "media" | "baixa" }) {
  const meta = priorityMeta[priority] ?? priorityMeta.media;
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide", meta.className)}>
      <Icon className="h-3.5 w-3.5" /> {meta.label}
    </span>
  );
}

function TimelineRow({
  item,
  expanded,
  onExpand,
  onToggleTask,
  onStartTask,
  onOpenSession,
  onMarkSessionDone,
  onToggleChart,
  onAnalyze,
  onUpdateContent,
  icon,
}: {
  item: TimelineItem;
  expanded: boolean;
  onExpand: () => void;
  onToggleTask: (task: any) => void;
  onStartTask: (task: any) => void;
  onOpenSession: (session: any) => void;
  onMarkSessionDone: (session: any) => void;
  onToggleChart: (session: any) => void;
  onAnalyze: (patientId: string) => void;
  onUpdateContent: (piece: any) => void;
  icon: React.ReactNode;
}) {
  const meta = priorityMeta[item.priority] ?? priorityMeta.media;
  const isDone = item.kind === "task" && item.raw.status === "concluida";

  return (
    <div className="rounded-md border border-border bg-background">
      <button onClick={onExpand} className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors">
        <span className={cn("shrink-0", item.kind === "task" && isDone ? "text-success" : meta.className)}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className={cn("text-sm font-medium truncate", isDone && "line-through text-muted-foreground")}>{item.title}</div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
            <PriorityPill priority={item.priority} />
            {item.time && <span className="tabular-nums">{item.time.slice(0, 5)}</span>}
            {item.status && <span className="truncate">{item.status}</span>}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border/60 text-sm space-y-3">
          {item.kind === "task" && (
            <>
              {item.raw.notes && <p className="text-muted-foreground whitespace-pre-wrap">{item.raw.notes}</p>}
              <LinkedInfo task={item.raw} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => onStartTask(item.raw)}><Play className="h-4 w-4 mr-1" />Start task</Button>
                <Button size="sm" variant="outline" onClick={() => onToggleTask(item.raw)}>{isDone ? "Reopen" : "Complete"}</Button>
              </div>
            </>
          )}

          {item.kind === "session" && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onOpenSession(item.raw)}>Open</Button>
              <Button size="sm" variant="outline" onClick={() => onAnalyze(item.raw.patient_id)}><Brain className="h-4 w-4 mr-1" />AI</Button>
              <Button size="sm" variant="outline" onClick={() => onToggleChart(item.raw)}><FileCheck2 className="h-4 w-4 mr-1" />Chart</Button>
              <Button size="sm" variant="outline" onClick={() => onMarkSessionDone(item.raw)}>Done</Button>
              <Button size="sm" variant="outline"><ListPlus className="h-4 w-4 mr-1" />Task</Button>
            </div>
          )}

          {item.kind === "content" && (
            <div className="space-y-2">
              {item.raw.hook && <p className="text-muted-foreground">{item.raw.hook}</p>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onUpdateContent({ ...item.raw, status: "publicado", pipeline_stage: "publicado", published_at: new Date().toISOString().slice(0, 10) })}>Mark published</Button>
              </div>
            </div>
          )}

          {item.kind === "event" && item.raw.location && <p className="text-muted-foreground">{item.raw.location}</p>}
        </div>
      )}
    </div>
  );
}

function LinkedInfo({ task }: { task: any }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
      {task.patient_id && <span className="inline-flex items-center gap-1"><Brain className="h-3 w-3" />Patient linked</span>}
      {task.content_piece_id && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />Content linked</span>}
      {task.therapy_session_id && <span className="inline-flex items-center gap-1"><Mic className="h-3 w-3" />Session linked</span>}
    </div>
  );
}
