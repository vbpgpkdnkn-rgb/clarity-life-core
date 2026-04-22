import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScopeBadge } from "@/components/ScopeBadge";
import { FocusSessionDialog } from "@/components/foco/FocusSessionDialog";
import { StrategicInsights } from "@/components/foco/StrategicInsights";
import { AdaptivePanel } from "@/components/foco/AdaptivePanel";
import { ContentTodayCard } from "@/components/foco/ContentTodayCard";
import { EisenhowerMatrix } from "@/components/foco/EisenhowerMatrix";
import { OneThreeFive } from "@/components/foco/OneThreeFive";
import { PomodoroCard } from "@/components/foco/PomodoroCard";
import { LifeCheckCard } from "@/components/foco/LifeCheckCard";
import { PinnedItemsCard } from "@/components/foco/PinnedItemsCard";
import { VidaQuickCard } from "@/components/foco/VidaQuickCard";
import { GoalsFocusCard } from "@/components/foco/GoalsFocusCard";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, useUpsertTask } from "@/hooks/useData";
import { useAllGoalsProgress } from "@/hooks/useGoalProgress";
import { useEvents } from "@/hooks/usePlanner";
import { useRecentAdjustments } from "@/hooks/useAdaptive";
import { useScope, filterByScope } from "@/contexts/ScopeContext";
import { todayISO, formatDateLong } from "@/lib/format";
import { toast } from "sonner";
import {
  Sparkles,
  Play,
  RefreshCw,
  Target as TargetIcon,
  Ban,
  Gauge,
  CheckCircle2,
  Circle,
  ListChecks,
  TrendingUp,
  ChevronDown,
  Brain,
  Clapperboard,
  LayoutGrid,
  Timer,
  BookOpen,
  Sparkle,
  Heart,
} from "lucide-react";

interface FocusItem {
  task_id: string;
  title: string;
  reason?: string;
}
interface FocusPlan {
  main_priority: { task_id?: string | null; title: string; why: string };
  top_three: FocusItem[];
  do_not_do: FocusItem[];
  load: { level: "leve" | "ideal" | "pesado" | "sobrecarregado"; advice: string };
}

const loadStyle: Record<FocusPlan["load"]["level"], string> = {
  leve: "text-success border-success/30 bg-success/5",
  ideal: "text-primary border-primary/30 bg-primary/5",
  pesado: "text-warning border-warning/30 bg-warning/5",
  sobrecarregado: "text-destructive border-destructive/30 bg-destructive/5",
};

export default function Foco() {
  const navigate = useNavigate();
  const { scope } = useScope();
  const today = todayISO();
  const qc = useQueryClient();

  const { data: tasksAll = [] } = useTasks();
  const { data: eventsAll = [] } = useEvents(today, today);
  const goalsAll = useAllGoalsProgress();
  const adjustmentsQ = useRecentAdjustments();
  const pendingAdj = (adjustmentsQ.data ?? []).filter((a: any) => a.status === "sugerido");

  const tasks = useMemo(() => filterByScope(tasksAll, scope), [tasksAll, scope]);
  const events = useMemo(() => filterByScope(eventsAll, scope), [eventsAll, scope]);
  const goals = useMemo(() => filterByScope(goalsAll, scope), [goalsAll, scope]);

  // Tarefas candidatas: pendentes/em_andamento, com prazo até hoje OU sem prazo de alta
  const candidateTasks = useMemo(() => {
    return tasks.filter(
      (t: any) =>
        t.status !== "concluida" &&
        (t.due_date === null || t.due_date <= today || t.due_date === today),
    );
  }, [tasks, today]);

  const focusKey = ["daily-focus", today, scope, candidateTasks.length, events.length, goals.length];

  const focusQuery = useQuery({
    queryKey: focusKey,
    queryFn: async () => {
      if (candidateTasks.length === 0) return null;
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
          goals: goals.map((g: any) => ({
            id: g.id,
            name: g.name,
            scope: g.scope,
            deadline: g.deadline,
            pct: g.progress?.pct,
            pace: g.progress?.pace,
          })),
          events: events.map((e: any) => ({
            title: e.title,
            start_time: e.start_time,
            end_time: e.end_time,
            scope: e.scope,
          })),
        },
      });
      if (error) throw error;
      return data as { focus: FocusPlan; generated_at: string };
    },
    enabled: candidateTasks.length > 0,
    staleTime: 1000 * 60 * 30, // 30 min
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const regenerate = useMutation({
    mutationFn: async () => {
      await qc.invalidateQueries({ queryKey: ["daily-focus"] });
      await focusQuery.refetch();
    },
  });

  const upsertTask = useUpsertTask();
  const [sessionOpen, setSessionOpen] = useState(false);

  const plan = focusQuery.data?.focus;
  const top3FullTasks = useMemo(() => {
    if (!plan) return [];
    return plan.top_three
      .map((it) => candidateTasks.find((t: any) => t.id === it.task_id))
      .filter(Boolean);
  }, [plan, candidateTasks]);

  // Revisão (a partir das 18h)
  const hour = new Date().getHours();
  const showReview = hour >= 18;
  const todayCompleted = tasks.filter((t: any) => t.due_date === today && t.status === "concluida").length;
  const todayTotal = tasks.filter((t: any) => t.due_date === today).length;
  const completionPct = todayTotal === 0 ? 0 : Math.round((todayCompleted / todayTotal) * 100);

  const toggleTask = (id: string) => {
    const t = tasks.find((x: any) => x.id === id) as any;
    if (!t) return;
    const newStatus = t.status === "concluida" ? "pendente" : "concluida";
    upsertTask.mutate({
      ...t,
      status: newStatus,
      completed_at: newStatus === "concluida" ? new Date().toISOString() : null,
    });
  };

  return (
    <AppLayout
      title="Foco do dia"
      subtitle={formatDateLong(today)}
      action={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => regenerate.mutate()}
            disabled={focusQuery.isFetching || regenerate.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${focusQuery.isFetching ? "animate-spin" : ""}`} />
            Regenerar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/visao-geral")}>
            Visão geral
          </Button>
        </div>
      }
    >
      {/* Itens fixados — sempre no topo, acessíveis em segundos */}
      <PinnedItemsCard />

      {/* Vida — check-in rápido + atalhos para sub-áreas (Livros, Faxina, etc.) */}
      <VidaQuickCard />

      {/* Metas no radar — atrasadas/críticas + próxima ação executável */}
      <GoalsFocusCard />

      {/* Aviso de ajustes da IA pendentes — visível quando faz sentido decidir */}
      {pendingAdj.length > 0 && (
        <button
          onClick={() => {
            const el = document.getElementById("ia-adaptativa-block");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
            el?.querySelector("button")?.click();
          }}
          className="w-full mb-4 px-4 py-2.5 rounded-md border border-accent/40 bg-accent/5 text-sm flex items-center gap-2 hover:bg-accent/10 transition-colors text-left"
        >
          <Brain className="h-4 w-4 text-accent shrink-0" />
          <span className="flex-1">
            <strong className="font-medium">{pendingAdj.length} ajuste{pendingAdj.length > 1 ? "s" : ""}</strong> da IA aguardando sua decisão
          </span>
          <span className="text-xs text-muted-foreground">Ver →</span>
        </button>
      )}

      {/* Empty state */}
      {candidateTasks.length === 0 && (
        <Card className="p-10 text-center border-border/60 shadow-none">
          <Sparkles className="h-8 w-8 mx-auto text-accent mb-3" />
          <h2 className="font-display text-xl font-semibold mb-2">Nenhuma tarefa pendente para hoje</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Crie tarefas com prazo para hoje e a IA vai montar seu plano de foco automaticamente.
          </p>
          <Button onClick={() => navigate("/tarefas")}>Ir para tarefas</Button>
        </Card>
      )}

      {/* Loading */}
      {candidateTasks.length > 0 && focusQuery.isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <div className="grid lg:grid-cols-2 gap-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      )}

      {/* Error */}
      {focusQuery.isError && (
        <Card className="p-6 border-destructive/40 bg-destructive/5 shadow-none">
          <p className="text-sm text-destructive">
            Não foi possível gerar o plano. {(focusQuery.error as any)?.message ?? ""}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => focusQuery.refetch()}>
            Tentar novamente
          </Button>
        </Card>
      )}

      {/* Plano */}
      {plan && (
        <>
          {/* PRIORIDADE PRINCIPAL */}
          <Card className="p-6 sm:p-8 mb-4 border-l-4 border-l-accent border-y border-r border-border/60 shadow-none rounded-md">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-accent mb-3">
              <Sparkles className="h-3 w-3" />
              Prioridade principal
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-3 leading-tight">
              {plan.main_priority.title}
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl">{plan.main_priority.why}</p>
            <Button
              onClick={() => {
                if (top3FullTasks.length === 0) {
                  toast.error("Top 3 não encontrado nas tarefas atuais");
                  return;
                }
                setSessionOpen(true);
              }}
            >
              <Play className="h-4 w-4 mr-2" /> Iniciar meu dia
            </Button>
          </Card>

          {/* CARGA — barra fina */}
          <div className={`mb-6 px-4 py-2.5 rounded-md border text-sm flex items-center gap-3 ${loadStyle[plan.load.level]}`}>
            <Gauge className="h-4 w-4 shrink-0" />
            <span className="text-xs uppercase tracking-wide font-medium capitalize shrink-0">
              {plan.load.level}
            </span>
            <span className="text-xs text-muted-foreground truncate">{plan.load.advice}</span>
          </div>

          {/* TOP 3 + NÃO FAZER */}
          <div className="grid lg:grid-cols-2 gap-4 mb-6">
            <Card className="p-5 border-border/60 shadow-none">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display text-base font-semibold">Top 3 do dia</h3>
              </div>
              <ol className="space-y-3">
                {plan.top_three.map((it, i) => {
                  const full = candidateTasks.find((t: any) => t.id === it.task_id) as any;
                  const done = full?.status === "concluida";
                  const linkedGoal = full?.goal_id ? goals.find((g: any) => g.id === full.goal_id) : null;
                  return (
                    <li key={it.task_id} className="flex gap-3 items-start group">
                      <button
                        onClick={() => full && toggleTask(full.id)}
                        className="shrink-0 mt-0.5"
                        disabled={!full}
                      >
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-accent" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display text-lg text-muted-foreground tabular-nums w-4">{i + 1}</span>
                          <span className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                            {it.title}
                          </span>
                          {full?.scope && <ScopeBadge scope={full.scope} />}
                          {linkedGoal && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/metas/${linkedGoal.id}`); }}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1"
                              title={`Meta: ${linkedGoal.name}`}
                            >
                              <TargetIcon className="h-2.5 w-2.5" /> {linkedGoal.name}
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground ml-7 mt-0.5">{it.reason}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>

            <Card className="p-5 border-border/60 shadow-none">
              <div className="flex items-center gap-2 mb-4">
                <Ban className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display text-base font-semibold">Não fazer hoje</h3>
              </div>
              {plan.do_not_do.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nada para adiar. Sua lista está limpa.
                </p>
              ) : (
                <ul className="space-y-3">
                  {plan.do_not_do.map((it) => (
                    <li key={it.task_id} className="flex gap-3 items-start opacity-70">
                      <Ban className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="text-sm line-through">{it.title}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">{it.reason}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* POMODORO + 1-3-5 — visíveis, são o coração da execução */}
          <div className="grid lg:grid-cols-2 gap-4 mb-6">
            <PomodoroCard tasks={tasks} />
            <Card className="p-5 border-border/60 shadow-none">
              <OneThreeFive tasks={tasks} />
            </Card>
          </div>
        </>
      )}

      {/* REVISÃO DO DIA — só após 18h */}
      {showReview && (
        <Card className="p-5 border-border/60 shadow-none mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-display text-base font-semibold">Revisão do dia</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <Stat label="Concluídas" value={`${todayCompleted}/${todayTotal}`} />
            <Stat label="Taxa" value={`${completionPct}%`} />
            <Stat
              label="Pendentes"
              value={String(todayTotal - todayCompleted)}
              accent={todayTotal - todayCompleted > 0 ? "warning" : "success"}
            />
          </div>
          <Progress value={completionPct} className="h-1.5 mb-4" />
          <Button variant="outline" size="sm" onClick={() => navigate("/planner")}>
            Registrar reflexão →
          </Button>
        </Card>
      )}

      {/* CHECKLIST VIDA — sempre visível para fechar o dia */}
      <LifeCheckCard />

      {/* BLOCOS COMPLEMENTARES — recolhidos por padrão pra não competir com foco */}
      <div className="space-y-2 mb-6">
        <CollapsibleBlock title="Matriz Eisenhower" icon={<LayoutGrid className="h-4 w-4" />}>
          <EisenhowerMatrix tasks={tasks} />
        </CollapsibleBlock>
        <CollapsibleBlock title="Conteúdo de hoje" icon={<Clapperboard className="h-4 w-4" />}>
          <ContentTodayCard />
        </CollapsibleBlock>
        <div id="ia-adaptativa-block">
          <CollapsibleBlock title="IA adaptativa — seu padrão de execução" icon={<Brain className="h-4 w-4" />}>
            <AdaptivePanel />
          </CollapsibleBlock>
        </div>
        <CollapsibleBlock title="Conselheiro estratégico" icon={<Sparkles className="h-4 w-4" />}>
          <StrategicInsights />
        </CollapsibleBlock>
      </div>

      {/* Atalhos discretos */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <ShortcutBtn label="Tarefas" onClick={() => navigate("/tarefas")} icon={<ListChecks className="h-4 w-4" />} />
        <ShortcutBtn label="Planner" onClick={() => navigate("/planner")} icon={<Sparkles className="h-4 w-4" />} />
        <ShortcutBtn label="Metas" onClick={() => navigate("/metas")} icon={<TargetIcon className="h-4 w-4" />} />
        <ShortcutBtn label="Vida" onClick={() => navigate("/vida")} icon={<Heart className="h-4 w-4" />} />
        <ShortcutBtn label="Livros" onClick={() => navigate("/vida/livros")} icon={<BookOpen className="h-4 w-4" />} />
        <ShortcutBtn label="Faxina" onClick={() => navigate("/vida/limpeza")} icon={<Sparkle className="h-4 w-4" />} />
        <ShortcutBtn label="Visão geral" onClick={() => navigate("/visao-geral")} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      {plan && (
        <FocusSessionDialog
          open={sessionOpen}
          onOpenChange={setSessionOpen}
          tasks={plan.top_three}
          fullTasks={candidateTasks}
        />
      )}
    </AppLayout>
  );
}

function CollapsibleBlock({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Collapsible>
      <Card className="border-border/60 shadow-none overflow-hidden">
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-2 text-sm font-medium hover:bg-muted/40 transition-colors group">
          <span className="text-muted-foreground">{icon}</span>
          <span className="flex-1 text-left">{title}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-1 [&_.shadow-soft]:shadow-none [&_.shadow-elevated]:shadow-none">
            {children}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "warning" | "success" }) {
  const cls = accent === "warning" ? "text-warning" : accent === "success" ? "text-success" : "text-foreground";
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function ShortcutBtn({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors flex items-center gap-2 text-sm"
    >
      <span className="text-accent">{icon}</span>
      {label}
    </button>
  );
}
