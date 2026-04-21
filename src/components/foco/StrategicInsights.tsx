import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStrategicAdvice } from "@/hooks/useStrategicAI";
import { useTasks, useDeleteTask, useUpsertTask } from "@/hooks/useData";
import { useAllGoalsProgress } from "@/hooks/useGoalProgress";
import { useScope, filterByScope } from "@/contexts/ScopeContext";
import { addDaysISO, todayISO, formatBRL } from "@/lib/format";
import {
  Scissors,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Activity,
  Target,
  Wallet,
  RefreshCw,
  Trash2,
  Clock,
  Info,
} from "lucide-react";
import { useMemo } from "react";

const severityCls: Record<string, string> = {
  danger: "border-destructive/40 bg-destructive/5 text-destructive",
  warning: "border-warning/40 bg-warning/5 text-warning",
  info: "border-border bg-muted/40 text-foreground",
};

const goalStatusCls: Record<string, string> = {
  no_alvo: "text-success bg-success/10",
  no_ritmo: "text-primary bg-primary/10",
  atrasada: "text-warning bg-warning/10",
  critica: "text-destructive bg-destructive/10",
};

const goalStatusLabel: Record<string, string> = {
  no_alvo: "no alvo",
  no_ritmo: "no ritmo",
  atrasada: "atrasada",
  critica: "crítica",
};

export function StrategicInsights() {
  const navigate = useNavigate();
  const { scope } = useScope();
  const { data, isLoading, isError, error, isFetching, regenerate } = useStrategicAdvice();
  const { data: tasksAll = [] } = useTasks();
  const goalsAll = useAllGoalsProgress();
  const tasks = useMemo(() => filterByScope(tasksAll, scope), [tasksAll, scope]);
  const goals = useMemo(() => filterByScope(goalsAll, scope), [goalsAll, scope]);

  const deleteTask = useDeleteTask();
  const upsertTask = useUpsertTask();

  if (isLoading) {
    return (
      <div className="space-y-4 mt-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-4 mt-6 border-destructive/40 bg-destructive/5">
        <p className="text-sm text-destructive">
          Conselheiro indisponível. {(error as any)?.message ?? ""}
        </p>
      </Card>
    );
  }

  if (!data?.advice) return null;
  const a = data.advice;

  const handleCutAction = (cut: { task_id: string; action: string }) => {
    const t = tasks.find((x: any) => x.id === cut.task_id) as any;
    if (!t) return;
    if (cut.action === "remover") {
      deleteTask.mutate(t.id);
    } else if (cut.action === "adiar") {
      const newDate = t.due_date ? addDaysISO(t.due_date, 7) : addDaysISO(todayISO(), 7);
      upsertTask.mutate({ ...t, due_date: newDate });
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent" />
          Conselheiro estratégico
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => regenerate.mutate()}
          disabled={isFetching || regenerate.isPending}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Alertas críticos */}
      {a.critical_alerts.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {a.critical_alerts.map((al, i) => {
            const Icon = al.severity === "info" ? Info : AlertTriangle;
            return (
              <Card key={i} className={`p-4 border ${severityCls[al.severity]}`}>
                <div className="flex items-start gap-3">
                  <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{al.title}</div>
                    <p className="text-xs text-muted-foreground mt-1">{al.detail}</p>
                    <p className="text-xs font-medium text-foreground mt-2">→ {al.action}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Cortes sugeridos */}
        <Card className="p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Scissors className="h-4 w-4 text-warning" />
            <h3 className="font-display text-lg font-semibold">Cortes sugeridos</h3>
          </div>
          {a.cuts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sua lista está enxuta.</p>
          ) : (
            <ul className="space-y-3">
              {a.cuts.map((c) => (
                <li key={c.task_id} className="flex gap-3 items-start group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{c.title}</span>
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {c.action}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.reason}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCutAction(c)}
                    title={c.action === "remover" ? "Excluir tarefa" : "Adiar 7 dias"}
                  >
                    {c.action === "remover" ? (
                      <Trash2 className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Diagnóstico de metas */}
        <Card className="p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-accent" />
            <h3 className="font-display text-lg font-semibold">Diagnóstico de metas</h3>
          </div>
          {a.goals_diagnosis.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma meta ativa.</p>
          ) : (
            <ul className="space-y-3">
              {a.goals_diagnosis.map((d) => {
                const goal = goals.find((g: any) => g.id === d.goal_id) as any;
                if (!goal) return null;
                return (
                  <li
                    key={d.goal_id}
                    className="cursor-pointer hover:bg-muted/40 -mx-2 px-2 py-1.5 rounded-md"
                    onClick={() => navigate("/metas")}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{goal.name}</span>
                      <span
                        className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${goalStatusCls[d.status]}`}
                      >
                        {goalStatusLabel[d.status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{d.note}</p>
                    <p className="text-xs font-medium text-accent mt-0.5">→ {d.advice}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Padrão financeiro */}
        <Card className="p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-4 w-4 text-accent" />
            <h3 className="font-display text-lg font-semibold">Padrão financeiro</h3>
            <span
              className={`ml-auto text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                a.financial_pattern.risk_level === "alto"
                  ? "bg-destructive/10 text-destructive"
                  : a.financial_pattern.risk_level === "medio"
                  ? "bg-warning/10 text-warning"
                  : "bg-success/10 text-success"
              }`}
            >
              risco {a.financial_pattern.risk_level}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{a.financial_pattern.summary}</p>
          {a.financial_pattern.top_waste.length > 0 && (
            <ul className="space-y-2 mb-3">
              {a.financial_pattern.top_waste.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <TrendingDown className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">{w.label}</span>
                      <span className="tabular-nums text-destructive font-medium">
                        {formatBRL(w.amount)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{w.suggestion}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="text-xs font-medium text-accent border-t border-border pt-3">
            → {a.financial_pattern.cut_target}
          </div>
        </Card>

        {/* Consistência */}
        <Card className="p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            {a.consistency.trend === "subindo" ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : a.consistency.trend === "caindo" ? (
              <TrendingDown className="h-4 w-4 text-destructive" />
            ) : (
              <Activity className="h-4 w-4 text-muted-foreground" />
            )}
            <h3 className="font-display text-lg font-semibold">Consistência</h3>
            <span className="ml-auto text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {a.consistency.trend}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{a.consistency.note}</p>
          <div className="text-xs font-medium text-accent border-t border-border pt-3">
            → {a.consistency.routine_tip}
          </div>
        </Card>
      </div>
    </div>
  );
}
