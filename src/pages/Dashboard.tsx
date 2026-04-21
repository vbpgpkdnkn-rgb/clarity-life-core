import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScopeBadge } from "@/components/ScopeBadge";
import { TaskFormDrawer } from "@/components/forms/TaskFormDrawer";
import { useTasks, useUpsertTask } from "@/hooks/useData";
import { useEvents } from "@/hooks/usePlanner";
import { useAllGoalsProgress } from "@/hooks/useGoalProgress";
import { useScope, filterByScope } from "@/contexts/ScopeContext";
import { todayISO, formatDateLong } from "@/lib/format";
import {
  Plus,
  CheckCircle2,
  Circle,
  Target,
  CalendarDays,
  ListTodo,
  ChevronRight,
} from "lucide-react";

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { scope } = useScope();
  const [taskOpen, setTaskOpen] = useState(false);
  const today = todayISO();
  const weekEnd = addDays(today, 6);

  const { data: tasksAll = [] } = useTasks();
  const { data: eventsAll = [] } = useEvents(today, weekEnd);
  const goalsAll = useAllGoalsProgress();
  const upsertTask = useUpsertTask();

  const tasks = useMemo(() => filterByScope(tasksAll, scope), [tasksAll, scope]);
  const events = useMemo(() => filterByScope(eventsAll, scope), [eventsAll, scope]);
  const goals = useMemo(() => filterByScope(goalsAll, scope), [goalsAll, scope]);

  // Próximos 7 dias
  const week = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(today, i);
      const dayTasks = tasks
        .filter((t: any) => t.due_date === date && t.status !== "concluida")
        .slice(0, 4);
      const dayEvents = events.filter((e: any) => e.date === date).slice(0, 3);
      const dow = new Date(date + "T00:00:00").getDay();
      return { date, dayTasks, dayEvents, weekday: WEEKDAY_SHORT[dow], isToday: date === today };
    });
  }, [today, tasks, events]);

  const overdueCount = tasks.filter(
    (t: any) => t.status !== "concluida" && t.due_date && t.due_date < today,
  ).length;
  const todayTasks = tasks.filter((t: any) => t.due_date === today);
  const pendingNoDate = tasks.filter((t: any) => t.status !== "concluida" && !t.due_date);
  const activeGoals = goals.filter((g: any) => g.status === "ativa").slice(0, 5);

  const toggleTask = (t: any) => {
    const newStatus = t.status === "concluida" ? "pendente" : "concluida";
    upsertTask.mutate({
      ...t,
      status: newStatus,
      completed_at: newStatus === "concluida" ? new Date().toISOString() : null,
    });
  };

  return (
    <AppLayout
      title="Visão geral"
      subtitle="Sua semana, suas tarefas, suas metas"
      action={
        <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Tarefa
        </Button>
      }
    >
      {/* Resumo numérico minimalista */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <SummaryStat
          label="Hoje"
          value={String(todayTasks.length)}
          hint={`${todayTasks.filter((t: any) => t.status === "concluida").length} concluídas`}
          onClick={() => navigate("/tarefas")}
        />
        <SummaryStat
          label="Atrasadas"
          value={String(overdueCount)}
          hint={overdueCount === 0 ? "tudo em dia" : "revisar"}
          accent={overdueCount > 0 ? "warning" : undefined}
          onClick={() => navigate("/tarefas")}
        />
        <SummaryStat
          label="Metas ativas"
          value={String(activeGoals.length)}
          hint={`${goals.filter((g: any) => g.progress?.pace === "atrasada").length} atrasadas`}
          onClick={() => navigate("/metas")}
        />
      </div>

      {/* Semana do planner */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-xl font-semibold">Próximos 7 dias</h2>
          </div>
          <button
            onClick={() => navigate("/planner")}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Abrir planner <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {week.map((d) => (
            <button
              key={d.date}
              onClick={() => navigate("/planner")}
              className={`text-left p-3 rounded-md border transition-colors min-h-[120px] ${
                d.isToday
                  ? "border-accent/60 bg-accent/5"
                  : "border-border/60 bg-card hover:bg-muted/40"
              }`}
            >
              <div className="flex items-baseline gap-1 mb-2">
                <span className={`text-xs uppercase tracking-wide ${d.isToday ? "text-accent font-semibold" : "text-muted-foreground"}`}>
                  {d.weekday}
                </span>
                <span className={`font-display text-lg ${d.isToday ? "text-accent" : "text-foreground"}`}>
                  {Number(d.date.slice(8))}
                </span>
              </div>
              <ul className="space-y-1">
                {d.dayEvents.map((e: any) => (
                  <li key={e.id} className="text-[11px] text-muted-foreground truncate">
                    {e.start_time?.slice(0, 5) ?? "•"} {e.title}
                  </li>
                ))}
                {d.dayTasks.map((t: any) => (
                  <li key={t.id} className="text-[11px] truncate flex items-center gap-1">
                    <Circle className="h-2 w-2 shrink-0 text-muted-foreground" />
                    {t.title}
                  </li>
                ))}
                {d.dayTasks.length === 0 && d.dayEvents.length === 0 && (
                  <li className="text-[11px] text-muted-foreground/60 italic">livre</li>
                )}
              </ul>
            </button>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Tarefas de hoje */}
        <Card className="p-5 border-border/60 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-base font-semibold">Hoje</h2>
            </div>
            <button
              onClick={() => navigate("/tarefas")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Ver todas →
            </button>
          </div>
          {todayTasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma tarefa para hoje.{" "}
              <button onClick={() => setTaskOpen(true)} className="text-accent hover:underline">
                Criar uma
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {todayTasks.map((t: any) => (
                <li key={t.id} className="flex items-center gap-3 group">
                  <button onClick={() => toggleTask(t)} className="shrink-0">
                    {t.status === "concluida" ? (
                      <CheckCircle2 className="h-5 w-5 text-accent" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                  <span
                    className={`text-sm flex-1 ${t.status === "concluida" ? "line-through text-muted-foreground" : ""}`}
                  >
                    {t.title}
                  </span>
                  <ScopeBadge scope={t.scope} />
                </li>
              ))}
            </ul>
          )}

          {pendingNoDate.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                Sem prazo ({pendingNoDate.length})
              </div>
              <ul className="space-y-1.5">
                {pendingNoDate.slice(0, 3).map((t: any) => (
                  <li key={t.id} className="text-sm text-muted-foreground truncate">
                    • {t.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Metas */}
        <Card className="p-5 border-border/60 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-base font-semibold">Metas em andamento</h2>
            </div>
            <button
              onClick={() => navigate("/metas")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Ver todas →
            </button>
          </div>
          {activeGoals.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Target className="h-6 w-6 text-muted-foreground" />
              Nenhuma meta ativa.
              <button onClick={() => navigate("/metas")} className="text-accent hover:underline">
                Criar primeira meta
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {activeGoals.map((g: any) => (
                <li
                  key={g.id}
                  onClick={() => navigate(`/metas/${g.id}`)}
                  className="cursor-pointer hover:bg-muted/40 -mx-2 px-2 py-1.5 rounded-md transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{g.name}</span>
                      <ScopeBadge scope={g.scope} />
                      {g.progress.pace === "atrasada" && (
                        <span className="text-[10px] uppercase text-warning font-semibold">atrasada</span>
                      )}
                    </div>
                    <span className="text-sm font-medium tabular-nums shrink-0">{g.progress.pct}%</span>
                  </div>
                  <Progress value={g.progress.pct} className="h-1.5" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <TaskFormDrawer open={taskOpen} onOpenChange={setTaskOpen} />
    </AppLayout>
  );
}

function SummaryStat({
  label,
  value,
  hint,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "warning";
  onClick?: () => void;
}) {
  const valueCls = accent === "warning" ? "text-warning" : "text-foreground";
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-md border border-border/60 bg-card hover:bg-muted/40 transition-colors"
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className={`font-display text-3xl font-semibold tabular-nums ${valueCls}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </button>
  );
}
