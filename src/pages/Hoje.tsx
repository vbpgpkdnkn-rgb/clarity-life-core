import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { FocusSessionDialog, type FocusTask } from "@/components/foco/FocusSessionDialog";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, useUpsertTask } from "@/hooks/useData";
import { useTherapySessions, usePatients } from "@/hooks/usePsicoterapia";
import { useContentProjects } from "@/hooks/useContentProject";
import { useScope, filterByScope, defaultScope } from "@/contexts/ScopeContext";
import { todayISO, formatDateLong } from "@/lib/format";
import { Play, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface FocusItem {
  task_id: string;
  title: string;
  reason?: string;
}
interface FocusPlan {
  main_priority: { task_id?: string | null; title: string; why: string };
  top_three: FocusItem[];
  do_not_do: FocusItem[];
  load: { level: string; advice: string };
}

const CONTENT_HINT = /(conte[uú]do|post|reel|carross?el|story|stories|roteiro|grava[cç][aã]o)/i;

export default function Hoje() {
  const today = todayISO();
  const { scope } = useScope();
  const { data: tasksAll = [] } = useTasks();
  const { data: sessions = [] } = useTherapySessions({ from: today, to: today });
  const { data: patients = [] } = usePatients();
  const { data: projects = [] } = useContentProjects();
  const upsertTask = useUpsertTask();

  const [quick, setQuick] = useState("");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [focusTasks, setFocusTasks] = useState<FocusTask[]>([]);
  const [focusFullTasks, setFocusFullTasks] = useState<any[]>([]);

  const tasks = useMemo(() => filterByScope(tasksAll, scope), [tasksAll, scope]);

  const candidateTasks = useMemo(
    () =>
      tasks.filter(
        (t: any) => t.status !== "concluida" && (t.due_date == null || t.due_date <= today),
      ),
    [tasks, today],
  );

  const focusQuery = useQuery({
    queryKey: ["daily-focus", today, scope, candidateTasks.length],
    enabled: candidateTasks.length > 0,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("daily-focus", {
        body: {
          date: today,
          scope,
          tasks: candidateTasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            due_date: t.due_date,
            priority: t.priority,
            status: t.status,
            scope: t.scope,
            goal_id: t.goal_id,
          })),
          goals: [],
          events: [],
        },
      });
      if (error) throw error;
      return data as { focus: FocusPlan };
    },
  });

  const plan = focusQuery.data?.focus;
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

  const startTask = (taskId: string, title: string) => {
    const full = tasks.find((x: any) => x.id === taskId);
    if (!full) {
      toast.error("Tarefa não encontrada");
      return;
    }
    setFocusTasks([{ task_id: taskId, title }]);
    setFocusFullTasks([full]);
    setSessionOpen(true);
  };

  // Conteúdo block
  const contentTasksToday = useMemo(
    () =>
      tasks.filter(
        (t: any) =>
          t.due_date === today &&
          t.status !== "concluida" &&
          t.scope === "profissional" &&
          CONTENT_HINT.test(t.title || ""),
      ),
    [tasks, today],
  );

  const oldestPipelineProject = useMemo(() => {
    const open = (projects as any[]).filter((p) => p.status !== "concluido" && p.status !== "arquivado");
    return open[open.length - 1] ?? null;
  }, [projects]);

  const showContent = contentTasksToday.length > 0 || !!oldestPipelineProject;

  const putContentIntoDay = async () => {
    if (!oldestPipelineProject) return;
    await upsertTask.mutateAsync({
      title: `Conteúdo: ${oldestPipelineProject.title}`,
      due_date: today,
      priority: "media",
      status: "pendente",
      scope: "profissional",
    });
    toast.success("Adicionado ao dia");
  };

  const captureIdea = async () => {
    const title = quick.trim();
    if (!title) return;
    await upsertTask.mutateAsync({
      title,
      status: "pendente",
      priority: "media",
      scope: defaultScope(scope),
    });
    setQuick("");
    toast.success("Capturado ✓");
  };

  return (
    <AppLayout title="Hoje" subtitle={formatDateLong(today)}>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* BLOCO 1 — PRIORIDADE */}
        <Card className="p-6 border-l-4 border-l-accent border-y border-r border-border/60 shadow-none rounded-md">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-accent mb-3">
            <Sparkles className="h-3 w-3" />
            Prioridade do dia
          </div>

          {candidateTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma tarefa para hoje. Adicione uma abaixo ↓
            </p>
          ) : focusQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          ) : plan ? (
            <>
              <h2 className="font-display text-2xl font-semibold leading-tight mb-1">
                {plan.main_priority.title}
              </h2>
              {plan.main_priority.why && (
                <p className="text-sm text-muted-foreground mb-5">{plan.main_priority.why}</p>
              )}

              <ul className="space-y-2">
                {plan.top_three.map((it) => {
                  const full = tasks.find((t: any) => t.id === it.task_id) as any;
                  const done = full?.status === "concluida";
                  return (
                    <li
                      key={it.task_id}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/40 group"
                    >
                      <Checkbox
                        checked={done}
                        onCheckedChange={() => toggleTask(full)}
                        disabled={!full}
                      />
                      <span
                        className={`flex-1 text-sm ${done ? "line-through text-muted-foreground" : ""}`}
                      >
                        {it.title}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => startTask(it.task_id, it.title)}
                        disabled={!full || done}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Iniciar
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar o plano agora.
            </p>
          )}
        </Card>

        {/* BLOCO 2 — SESSÕES */}
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

        {/* BLOCO 3 — CONTEÚDO */}
        {showContent && (
          <Card className="p-5 border-border/60 shadow-none">
            <h3 className="font-display text-base font-semibold mb-3">Conteúdo</h3>
            {contentTasksToday.length > 0 ? (
              <ul className="space-y-1.5">
                {contentTasksToday.map((t: any) => (
                  <li key={t.id} className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={t.status === "concluida"}
                      onCheckedChange={() => toggleTask(t)}
                    />
                    <span>{t.title}</span>
                  </li>
                ))}
              </ul>
            ) : oldestPipelineProject ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {oldestPipelineProject.title}
                  </div>
                  <div className="text-xs text-muted-foreground">No pipeline</div>
                </div>
                <Button size="sm" variant="outline" onClick={putContentIntoDay}>
                  Colocar no meu dia
                </Button>
              </div>
            ) : null}
          </Card>
        )}

        {/* BLOCO 4 — CAPTURA */}
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
          </div>
        </Card>
      </div>

      <FocusSessionDialog
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        tasks={focusTasks}
        fullTasks={focusFullTasks}
      />
    </AppLayout>
  );
}
