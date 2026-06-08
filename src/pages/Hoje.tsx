import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Play, Trash2, Zap, CalendarDays, Clock, CornerDownLeft, ChevronDown, Plus, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

type Quadrant =
  | "urgente_importante"
  | "importante_nao_urgente"
  | "urgente_nao_importante"
  | "nao_urgente_nao_importante";

function inferQuadrant(t: any, today: string): Quadrant {
  if (t.eisenhower) return t.eisenhower as Quadrant;
  const urgent = !!t.due_date && t.due_date <= today;
  const important = t.priority === "alta";
  if (urgent && important) return "urgente_importante";
  if (!urgent && important) return "importante_nao_urgente";
  if (urgent && !important) return "urgente_nao_importante";
  return "nao_urgente_nao_importante";
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

  const tasks = useMemo(() => filterByScope(tasksAll, scope), [tasksAll, scope]);

  // Tarefas relevantes para hoje: due_date <= today (inclui atrasadas) OU prioridade alta sem data
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
      // pode entrar como importante_nao_urgente se eisenhower não estiver setado pra outra coisa
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

  const totalShown =
    quadrants.urgente_importante.length +
    quadrants.importante_nao_urgente.length +
    quadrants.urgente_nao_importante.length +
    quadrants.nao_urgente_nao_importante.length;

  const headerAction = completedToday.length > 0 ? (
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
  ) : null;

  return (
    <AppLayout title="Hoje" subtitle={formatDateLong(today)} action={headerAction}>
      <div className="space-y-4 max-w-3xl mx-auto">
        {totalShown === 0 ? (
          <Card className="p-8 text-center border-border/60 shadow-none">
            <p className="text-sm text-muted-foreground mb-4">Nenhuma tarefa para hoje.</p>
            <Button onClick={() => setDrawerOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar tarefa
            </Button>
          </Card>
        ) : (
          <>
            <QuadrantSection
              title="Fazer agora"
              icon={<Zap className="h-4 w-4" />}
              tasks={quadrants.urgente_importante}
              bg="bg-destructive/10"
              border="border-l-destructive"
              onToggle={toggleTask}
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
              onToggle={toggleTask}
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
              onToggle={toggleTask}
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
                          onToggle={toggleTask}
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
          </>
        )}

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
  onToggle,
  actions,
}: {
  title: string;
  icon: React.ReactNode;
  tasks: any[];
  bg: string;
  border: string;
  onToggle: (t: any) => void;
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
          <TaskRow key={t.id} task={t} onToggle={onToggle} actions={actions?.(t)} />
        ))}
      </div>
    </Card>
  );
}

function TaskRow({
  task,
  onToggle,
  actions,
}: {
  task: any;
  onToggle: (t: any) => void;
  actions?: React.ReactNode;
}) {
  const done = task.status === "concluida";
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-background/60 group">
      <Checkbox checked={done} onCheckedChange={() => onToggle(task)} />
      <span className={`flex-1 text-sm ${done ? "line-through text-muted-foreground" : ""}`}>
        {task.title}
      </span>
      {actions && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">{actions}</div>
      )}
    </div>
  );
}
