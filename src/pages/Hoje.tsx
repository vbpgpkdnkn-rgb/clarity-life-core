import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FocusSessionDialog, type FocusTask } from "@/components/foco/FocusSessionDialog";
import { TaskFormDrawer } from "@/components/forms/TaskFormDrawer";
import { useTasks, useUpsertTask, useDeleteTask } from "@/hooks/useData";
import { useTherapySessions, usePatients } from "@/hooks/usePsicoterapia";
import { useScope, filterByScope, defaultScope } from "@/contexts/ScopeContext";
import { todayISO, formatDateLong, addDaysISO } from "@/lib/format";
import {
  Play,
  Trash2,
  Zap,
  CalendarDays,
  Clock,
  CornerDownLeft,
  ChevronDown,
  Plus,
  LayoutGrid,
  Layers,
  Pause,
  SkipForward,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

type Quadrant =
  | "urgente_importante"
  | "importante_nao_urgente"
  | "urgente_nao_importante"
  | "nao_urgente_nao_importante";

const QUADRANT_META: Record<Quadrant, { label: string; icon: string; color: string; bg: string }> = {
  urgente_importante: { label: "Agora", icon: "⚡", color: "text-destructive", bg: "bg-destructive/15 text-destructive" },
  importante_nao_urgente: { label: "Planejar", icon: "📌", color: "text-primary", bg: "bg-primary/15 text-primary" },
  urgente_nao_importante: { label: "Encaixar", icon: "⏰", color: "text-warning", bg: "bg-warning/15 text-warning" },
  nao_urgente_nao_importante: { label: "Depois", icon: "↩", color: "text-muted-foreground", bg: "bg-muted text-muted-foreground" },
};

const QUEUE_ORDER: Quadrant[] = [
  "urgente_importante",
  "urgente_nao_importante",
  "importante_nao_urgente",
  "nao_urgente_nao_importante",
];

const TIME_OPTIONS = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 horas" },
];

function inferQuadrant(t: any, today: string): Quadrant {
  if (t.eisenhower) return t.eisenhower as Quadrant;
  const urgent = !!t.due_date && t.due_date <= today;
  const important = t.priority === "alta";
  if (urgent && important) return "urgente_importante";
  if (!urgent && important) return "importante_nao_urgente";
  if (urgent && !important) return "urgente_nao_importante";
  return "nao_urgente_nao_importante";
}

function formatMMSS(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Hoje() {
  const today = todayISO();
  const { scope } = useScope();
  const { data: tasksAll = [] } = useTasks();
  const { data: sessions = [] } = useTherapySessions({ from: today, to: today });
  const { data: patients = [] } = usePatients();
  const upsertTask = useUpsertTask();
  const deleteTask = useDeleteTask();

  const [quick, setQuick] = useState("");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [focusTasks, setFocusTasks] = useState<FocusTask[]>([]);
  const [focusFullTasks, setFocusFullTasks] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTask, setDrawerTask] = useState<any>(null);

  // Modo Fila
  const [queueMode, setQueueMode] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);

  const tasks = useMemo(() => filterByScope(tasksAll, scope), [tasksAll, scope]);

  const todayTasks = useMemo(
    () =>
      tasks.filter(
        (t: any) =>
          t.status !== "concluida" &&
          ((t.due_date && t.due_date <= today) ||
            (!t.due_date && t.priority === "alta")),
      ),
    [tasks, today],
  );

  const futureImportant = useMemo(
    () =>
      tasks.filter(
        (t: any) =>
          t.status !== "concluida" &&
          t.priority === "alta" &&
          t.due_date &&
          t.due_date > today,
      ),
    [tasks, today],
  );

  const quadrants = useMemo(() => {
    const groups: Record<Quadrant, any[]> = {
      urgente_importante: [],
      importante_nao_urgente: [],
      urgente_nao_importante: [],
      nao_urgente_nao_importante: [],
    };
    for (const t of todayTasks) groups[inferQuadrant(t, today)].push(t);
    for (const t of futureImportant) {
      const q = inferQuadrant(t, today);
      if (q === "importante_nao_urgente") groups[q].push(t);
    }
    return groups;
  }, [todayTasks, futureImportant, today]);

  const completedToday = useMemo(
    () => tasks.filter((t: any) => t.status === "concluida" && t.due_date === today),
    [tasks, today],
  );

  const patientById = useMemo(
    () => Object.fromEntries((patients as any[]).map((p) => [p.id, p])),
    [patients],
  );

  const toggleTask = (t: any) => {
    if (!t) return;
    const done = t.status !== "concluida";
    upsertTask.mutate({
      ...t,
      status: done ? "concluida" : "pendente",
      completed_at: done ? new Date().toISOString() : null,
    });
  };

  const updateTask = (t: any) => (fields: any) => {
    upsertTask.mutate({ ...t, ...fields });
  };

  const startTask = (t: any) => {
    setFocusTasks([{ task_id: t.id, title: t.title }]);
    setFocusFullTasks([t]);
    setSessionOpen(true);
  };

  const moveToToday = (t: any) => {
    upsertTask.mutate({ ...t, due_date: today });
    toast.success("Movido para hoje");
  };

  const snooze = (t: any) => {
    upsertTask.mutate({ ...t, due_date: addDaysISO(today, 1) });
    toast.success("Adiada 1 dia");
  };

  const captureIdea = async () => {
    const title = quick.trim();
    if (!title) return;
    await upsertTask.mutateAsync({
      title,
      due_date: today,
      status: "pendente",
      priority: "alta",
      eisenhower: "urgente_importante",
      scope: defaultScope(scope),
    });
    setQuick("");
    toast.success("Capturado ✓");
  };

  const clearCompleted = async () => {
    for (const t of completedToday) {
      await deleteTask.mutateAsync(t.id);
    }
    toast.success("Concluídas removidas");
  };

  // ============ MODO FILA ============
  const buildQueue = () => {
    const all: any[] = [];
    for (const q of QUEUE_ORDER) {
      const group = (quadrants[q] || []).slice().sort((a, b) => {
        const am = a.estimated_minutes ?? Number.POSITIVE_INFINITY;
        const bm = b.estimated_minutes ?? Number.POSITIVE_INFINITY;
        return am - bm;
      });
      all.push(...group);
    }
    return all;
  };

  const enterQueueMode = () => {
    const q = buildQueue();
    if (q.length === 0) {
      toast.info("Nenhuma tarefa para fazer agora.");
      return;
    }
    setQueue(q);
    setQueueIndex(0);
    const first = q[0];
    if (first?.estimated_minutes) {
      setTimeLeft(first.estimated_minutes * 60);
      setTimerRunning(true);
    } else {
      setTimeLeft(null);
      setTimerRunning(false);
    }
    setQueueMode(true);
  };

  const exitQueueMode = () => {
    setQueueMode(false);
    setQueue([]);
    setQueueIndex(0);
    setTimeLeft(null);
    setTimerRunning(false);
  };

  const currentQueueTask = queueMode ? queue[queueIndex] : null;
  const nextQueueTask = queueMode ? queue[queueIndex + 1] : null;

  const advanceQueue = async () => {
    const cur = currentQueueTask;
    if (!cur) return;
    await upsertTask.mutateAsync({
      ...cur,
      status: "concluida",
      completed_at: new Date().toISOString(),
    });
    const nextIdx = queueIndex + 1;
    if (nextIdx >= queue.length) {
      toast.success("Parabéns! Todas as tarefas concluídas. 🎉");
      exitQueueMode();
      return;
    }
    setQueueIndex(nextIdx);
    const nxt = queue[nextIdx];
    if (nxt?.estimated_minutes) {
      setTimeLeft(nxt.estimated_minutes * 60);
      setTimerRunning(true);
    } else {
      setTimeLeft(null);
      setTimerRunning(false);
    }
  };

  // Timer
  useEffect(() => {
    if (!queueMode || !timerRunning || timeLeft === null) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setTimerRunning(false);
          toast.info("Tempo esgotado! Concluiu a tarefa?");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [queueMode, timerRunning, timeLeft]);

  const totalShown =
    quadrants.urgente_importante.length +
    quadrants.importante_nao_urgente.length +
    quadrants.urgente_nao_importante.length +
    quadrants.nao_urgente_nao_importante.length;

  const headerAction = (
    <div className="flex items-center gap-2">
      {totalShown > 0 && !queueMode && (
        <Button variant="outline" size="sm" onClick={enterQueueMode}>
          <Layers className="h-3.5 w-3.5 mr-1" />
          Modo Fila
        </Button>
      )}
      {queueMode && (
        <Button variant="outline" size="sm" className="text-destructive" onClick={exitQueueMode}>
          <X className="h-3.5 w-3.5 mr-1" />
          Sair da fila
        </Button>
      )}
      {completedToday.length > 0 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Limpar concluídas ({completedToday.length})
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar concluídas?</AlertDialogTitle>
              <AlertDialogDescription>
                Remover todas as tarefas concluídas de hoje? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={clearCompleted}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );

  // Render queue card
  const queueCard = queueMode && currentQueueTask ? (
    (() => {
      const q = inferQuadrant(currentQueueTask, today);
      const meta = QUADRANT_META[q];
      const totalSeconds = (currentQueueTask.estimated_minutes ?? 0) * 60;
      const progressPct =
        timeLeft !== null && totalSeconds > 0
          ? ((totalSeconds - timeLeft) / totalSeconds) * 100
          : 0;
      return (
        <Card className="p-6 border-2 border-primary shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Fazendo agora
            </span>
            <Badge className={meta.bg}>
              {meta.icon} {meta.label}
            </Badge>
          </div>
          <h3 className="font-display text-xl font-semibold mb-4">{currentQueueTask.title}</h3>

          {currentQueueTask.estimated_minutes ? (
            <div className="space-y-3 mb-4">
              <Progress value={progressPct} className="h-2" />
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl tabular-nums">
                  {formatMMSS(timeLeft ?? totalSeconds)}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimerRunning((r) => !r)}
                  >
                    {timerRunning ? (
                      <>
                        <Pause className="h-3.5 w-3.5 mr-1" /> Pausar
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 mr-1" /> Retomar
                      </>
                    )}
                  </Button>
                  <Button size="sm" onClick={advanceQueue}>
                    <SkipForward className="h-3.5 w-3.5 mr-1" />
                    Concluir e avançar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-4">
              <Button onClick={advanceQueue}>
                <Check className="h-4 w-4 mr-1" />
                Concluir e avançar
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border/60 pt-3">
            <span>
              {nextQueueTask
                ? `Próxima: ${nextQueueTask.title}`
                : "Você terminou todas as tarefas de hoje 🎉"}
            </span>
            <span className="tabular-nums">
              {queueIndex + 1} de {queue.length} tarefas
            </span>
          </div>
        </Card>
      );
    })()
  ) : null;

  return (
    <AppLayout title="Hoje" subtitle={formatDateLong(today)} action={headerAction}>
      <div className="space-y-4 max-w-3xl mx-auto">
        {queueCard}

        <div className={queueMode ? "opacity-50 pointer-events-none" : ""}>
          {totalShown === 0 ? (
            <Card className="p-8 text-center border-border/60 shadow-none">
              <p className="text-sm text-muted-foreground mb-4">Nenhuma tarefa para hoje.</p>
              <Button onClick={() => setDrawerOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar tarefa
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              <QuadrantSection
                title="Fazer agora"
                icon={<Zap className="h-4 w-4" />}
                tasks={quadrants.urgente_importante}
                bg="bg-destructive/10"
                border="border-l-destructive"
                today={today}
                currentId={currentQueueTask?.id}
                onToggle={toggleTask}
                onUpdate={updateTask}
                actions={(t) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => startTask(t)}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Iniciar
                  </Button>
                )}
              />
              <QuadrantSection
                title="Agendar um tempo"
                icon={<CalendarDays className="h-4 w-4" />}
                tasks={quadrants.importante_nao_urgente}
                bg="bg-primary/10"
                border="border-l-primary"
                today={today}
                currentId={currentQueueTask?.id}
                onToggle={toggleTask}
                onUpdate={updateTask}
                actions={(t) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => moveToToday(t)}
                  >
                    Mover para hoje
                  </Button>
                )}
              />
              <QuadrantSection
                title="Encaixar no dia"
                icon={<Clock className="h-4 w-4" />}
                tasks={quadrants.urgente_nao_importante}
                bg="bg-warning/10"
                border="border-l-warning"
                today={today}
                currentId={currentQueueTask?.id}
                onToggle={toggleTask}
                onUpdate={updateTask}
              />
              {quadrants.nao_urgente_nao_importante.length > 0 && (
                <Collapsible>
                  <Card className="bg-muted/40 border-l-4 border-l-muted-foreground/30 border-y border-r border-border/60 shadow-none rounded-md overflow-hidden">
                    <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between text-sm hover:bg-muted/30">
                      <span className="flex items-center gap-2 font-medium text-muted-foreground">
                        <CornerDownLeft className="h-4 w-4" />
                        Remanejar ou eliminar
                        <span className="text-xs opacity-70">
                          ({quadrants.nao_urgente_nao_importante.length})
                        </span>
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-3 pt-1 space-y-1.5">
                        {quadrants.nao_urgente_nao_importante.map((t: any) => (
                          <TaskRow
                            key={t.id}
                            task={t}
                            today={today}
                            highlighted={currentQueueTask?.id === t.id}
                            onToggle={toggleTask}
                            onUpdate={updateTask(t)}
                            actions={
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => snooze(t)}
                              >
                                Adiar 1 dia
                              </Button>
                            }
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}
            </div>
          )}
        </div>

        {/* Sessões */}
        {sessions.length > 0 && (
          <Card className="p-5 border-border/60 shadow-none">
            <h3 className="font-display text-base font-semibold mb-3">Clínica hoje</h3>
            <ul className="space-y-1.5">
              {(sessions as any[]).map((s) => (
                <li key={s.id} className="flex items-center gap-3 text-sm">
                  <span className="tabular-nums text-muted-foreground w-12">
                    {s.start_time?.slice(0, 5) ?? "--:--"}
                  </span>
                  <span>{patientById[s.patient_id]?.name ?? "Sessão"}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Captura */}
        <Card className="p-5 border-border/60 shadow-none">
          <div className="flex gap-2">
            <Input
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  captureIdea();
                }
              }}
              placeholder="O que está na sua cabeça agora?"
              className="h-11"
            />
            <Button onClick={captureIdea} className="h-11 px-4">
              Capturar
            </Button>
            <Button
              variant="outline"
              className="h-11 px-3"
              onClick={() => {
                const title = quick.trim();
                setDrawerTask(title ? { title, due_date: today } : null);
                setQuick("");
                setDrawerOpen(true);
              }}
              title="Classificar antes de salvar"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Classificar
            </Button>
          </div>
        </Card>
      </div>

      <Button
        onClick={() => {
          setDrawerTask(null);
          setDrawerOpen(true);
        }}
        className="fixed bottom-6 right-6 rounded-full h-12 w-12 shadow-lg z-50 p-0"
        aria-label="Nova tarefa"
      >
        <Plus className="h-5 w-5" />
      </Button>

      <TaskFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        task={drawerTask}
        defaultDate={today}
      />
      <FocusSessionDialog
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        tasks={focusTasks}
        fullTasks={focusFullTasks}
      />
    </AppLayout>
  );
}

function QuadrantSection({
  title,
  icon,
  tasks,
  bg,
  border,
  today,
  currentId,
  onToggle,
  onUpdate,
  actions,
}: {
  title: string;
  icon: React.ReactNode;
  tasks: any[];
  bg: string;
  border: string;
  today: string;
  currentId?: string;
  onToggle: (t: any) => void;
  onUpdate: (t: any) => (fields: any) => void;
  actions?: (t: any) => React.ReactNode;
}) {
  if (tasks.length === 0) return null;
  return (
    <Card className={`${bg} border-l-4 ${border} border-y border-r border-border/60 shadow-none rounded-md p-4`}>
      <div className="flex items-center gap-2 text-sm font-medium mb-3">
        {icon}
        {title}
      </div>
      <div className="space-y-1.5">
        {tasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            today={today}
            highlighted={currentId === t.id}
            onToggle={onToggle}
            onUpdate={onUpdate(t)}
            actions={actions?.(t)}
          />
        ))}
      </div>
    </Card>
  );
}

function TaskRow({
  task,
  today,
  highlighted,
  onToggle,
  onUpdate,
  actions,
}: {
  task: any;
  today: string;
  highlighted?: boolean;
  onToggle: (t: any) => void;
  onUpdate: (fields: any) => void;
  actions?: React.ReactNode;
}) {
  const done = task.status === "concluida";
  const currentQuadrant = task.eisenhower as Quadrant | undefined;
  const quadrantColor = currentQuadrant
    ? QUADRANT_META[currentQuadrant].color
    : "text-muted-foreground";
  const timeLabel = task.estimated_minutes
    ? TIME_OPTIONS.find((o) => o.value === task.estimated_minutes)?.label
    : null;

  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-background/60 group ${
        highlighted ? "ring-2 ring-primary" : ""
      }`}
    >
      <Checkbox checked={done} onCheckedChange={() => onToggle(task)} />
      <span className={`flex-1 text-sm ${done ? "line-through text-muted-foreground" : ""}`}>
        {task.title}
      </span>

      <Select
        value={task.estimated_minutes ? String(task.estimated_minutes) : ""}
        onValueChange={(v) => onUpdate({ estimated_minutes: Number(v) })}
      >
        <SelectTrigger className="h-7 text-xs border-none bg-transparent w-auto gap-1 px-2 text-muted-foreground hover:bg-background/80 focus:ring-0">
          {timeLabel ? (
            <span className="text-muted-foreground">{timeLabel}</span>
          ) : (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> tempo
            </span>
          )}
        </SelectTrigger>
        <SelectContent>
          {TIME_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={String(o.value)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentQuadrant ?? ""}
        onValueChange={(v) => {
          const priority =
            v === "urgente_importante" || v === "importante_nao_urgente"
              ? "alta"
              : v === "urgente_nao_importante"
              ? "media"
              : "baixa";
          onUpdate({ eisenhower: v, priority });
        }}
      >
        <SelectTrigger
          className={`h-7 text-xs border-none bg-transparent w-auto gap-1 px-2 hover:bg-background/80 focus:ring-0 ${quadrantColor}`}
        >
          {currentQuadrant ? (
            <span className={quadrantColor}>
              {QUADRANT_META[currentQuadrant].icon} {QUADRANT_META[currentQuadrant].label}
            </span>
          ) : (
            <LayoutGrid className="h-3 w-3" />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="urgente_importante">⚡ Agora</SelectItem>
          <SelectItem value="importante_nao_urgente">📌 Planejar</SelectItem>
          <SelectItem value="urgente_nao_importante">⏰ Encaixar</SelectItem>
          <SelectItem value="nao_urgente_nao_importante">↩ Depois</SelectItem>
        </SelectContent>
      </Select>

      {actions && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">{actions}</div>
      )}
    </div>
  );
}
