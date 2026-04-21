import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScopeBadge } from "@/components/ScopeBadge";
import { TaskFormDrawer } from "@/components/forms/TaskFormDrawer";
import { TransactionFormDrawer } from "@/components/forms/TransactionFormDrawer";
import { useTasks, useTransactions, useUpsertTask } from "@/hooks/useData";
import { useAllGoalsProgress } from "@/hooks/useGoalProgress";
import { useAccountBalances } from "@/hooks/useData";
import { formatBRL, todayISO, startOfMonthISO, endOfMonthISO } from "@/lib/format";
import { Plus, AlertTriangle, TrendingUp, TrendingDown, Wallet, CheckCircle2, Circle, Target } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [taskOpen, setTaskOpen] = useState(false);
  const [txnOpen, setTxnOpen] = useState(false);
  const { data: tasks = [] } = useTasks();
  const { data: txns = [] } = useTransactions();
  const accounts = useAccountBalances();
  const goals = useAllGoalsProgress();
  const upsertTask = useUpsertTask();

  const today = todayISO();
  const monthStart = startOfMonthISO();
  const monthEnd = endOfMonthISO();

  const todayTasks = tasks.filter((t) => t.due_date === today);
  const overdueTasks = tasks.filter(
    (t) => t.status !== "concluida" && t.due_date && t.due_date < today,
  );
  const overdueGoals = goals.filter(
    (g) => g.status === "ativa" && g.deadline && g.deadline < today && g.progress.pct < 100,
  );

  const monthTxns = txns.filter((t) => t.date >= monthStart && t.date <= monthEnd);
  const receitas = monthTxns.filter((t) => t.type === "entrada").reduce((s, t) => s + Number(t.amount), 0);
  const despesas = monthTxns.filter((t) => t.type === "saida").reduce((s, t) => s + Number(t.amount), 0);
  const saldoTotal = accounts.reduce((s, a) => s + a.balance, 0);
  const lucro = receitas - despesas;

  const activeGoals = goals.filter((g) => g.status === "ativa").slice(0, 4);

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
      title="Dashboard"
      subtitle="Sua visão geral do dia"
      action={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTaskOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Tarefa
          </Button>
          <Button size="sm" onClick={() => setTxnOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Transação
          </Button>
        </div>
      }
    >
      {/* Alertas */}
      {(overdueTasks.length > 0 || overdueGoals.length > 0) && (
        <div className="mb-6 grid sm:grid-cols-2 gap-3">
          {overdueTasks.length > 0 && (
            <button
              onClick={() => navigate("/planner")}
              className="text-left p-4 rounded-lg border border-warning/40 bg-warning/5 hover:bg-warning/10 transition-colors flex items-center gap-3"
            >
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <div>
                <div className="font-medium text-sm">{overdueTasks.length} {overdueTasks.length === 1 ? "tarefa atrasada" : "tarefas atrasadas"}</div>
                <div className="text-xs text-muted-foreground">Toque para revisar</div>
              </div>
            </button>
          )}
          {overdueGoals.length > 0 && (
            <button
              onClick={() => navigate("/metas")}
              className="text-left p-4 rounded-lg border border-destructive/40 bg-destructive/5 hover:bg-destructive/10 transition-colors flex items-center gap-3"
            >
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <div className="font-medium text-sm">{overdueGoals.length} {overdueGoals.length === 1 ? "meta atrasada" : "metas atrasadas"}</div>
                <div className="text-xs text-muted-foreground">Toque para revisar</div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Financeiro snapshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <KpiCard
          label="Saldo total"
          value={formatBRL(saldoTotal)}
          icon={<Wallet className="h-4 w-4" />}
          accent="primary"
          onClick={() => navigate("/financeiro")}
        />
        <KpiCard
          label="Receitas no mês"
          value={formatBRL(receitas)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="success"
          onClick={() => navigate("/financeiro")}
        />
        <KpiCard
          label="Despesas no mês"
          value={formatBRL(despesas)}
          icon={<TrendingDown className="h-4 w-4" />}
          accent="destructive"
          onClick={() => navigate("/financeiro")}
        />
        <KpiCard
          label={lucro >= 0 ? "Lucro do mês" : "Prejuízo do mês"}
          value={formatBRL(Math.abs(lucro))}
          icon={lucro >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          accent={lucro >= 0 ? "success" : "destructive"}
          onClick={() => navigate("/financeiro")}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tarefas de hoje */}
        <Card className="p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Hoje</h2>
            <button
              onClick={() => navigate("/planner")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Ver planner →
            </button>
          </div>
          {todayTasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma tarefa para hoje. <button onClick={() => setTaskOpen(true)} className="text-accent hover:underline">Criar uma</button>
            </div>
          ) : (
            <ul className="space-y-2">
              {todayTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 group">
                  <button onClick={() => toggleTask(t)} className="shrink-0">
                    {t.status === "concluida" ? (
                      <CheckCircle2 className="h-5 w-5 text-accent" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                  <span className={`text-sm flex-1 ${t.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
                    {t.title}
                  </span>
                  <ScopeBadge scope={t.scope} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Metas em andamento */}
        <Card className="p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Metas em andamento</h2>
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
              <button onClick={() => navigate("/metas")} className="text-accent hover:underline">Criar primeira meta</button>
            </div>
          ) : (
            <ul className="space-y-4">
              {activeGoals.map((g) => (
                <li
                  key={g.id}
                  onClick={() => navigate("/metas")}
                  className="cursor-pointer hover:bg-muted/40 -mx-2 px-2 py-1.5 rounded-md transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{g.name}</span>
                      <ScopeBadge scope={g.scope} />
                    </div>
                    <span className="text-sm font-medium tabular-nums">{g.progress.pct}%</span>
                  </div>
                  <Progress value={g.progress.pct} className="h-2" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <TaskFormDrawer open={taskOpen} onOpenChange={setTaskOpen} />
      <TransactionFormDrawer open={txnOpen} onOpenChange={setTxnOpen} />
    </AppLayout>
  );
}

function KpiCard({
  label,
  value,
  icon,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "primary" | "success" | "destructive";
  onClick?: () => void;
}) {
  const accentColor = {
    primary: "text-foreground",
    success: "text-success",
    destructive: "text-destructive",
  }[accent];
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-lg border border-border bg-card hover:shadow-elevated transition-all gradient-card"
    >
      <div className={`flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-2`}>
        <span className={accentColor}>{icon}</span>
        {label}
      </div>
      <div className={`font-display text-2xl font-semibold tabular-nums ${accentColor}`}>{value}</div>
    </button>
  );
}
