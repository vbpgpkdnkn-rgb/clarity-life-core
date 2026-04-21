import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScopeBadge } from "@/components/ScopeBadge";
import { TaskFormDrawer } from "@/components/forms/TaskFormDrawer";
import { TransactionFormDrawer } from "@/components/forms/TransactionFormDrawer";
import {
  useTasks,
  useTransactions,
  useUpsertTask,
  useAccounts,
  useRecurrences,
} from "@/hooks/useData";
import { useAllGoalsProgress } from "@/hooks/useGoalProgress";
import { useScope, filterByScope } from "@/contexts/ScopeContext";
import {
  formatBRL,
  todayISO,
  startOfMonthISO,
  endOfMonthISO,
} from "@/lib/format";
import { balancesByScope, cashFlow, projectBalance, buildAlerts } from "@/lib/finance";
import {
  Plus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wallet,
  CheckCircle2,
  Circle,
  Target,
  Info,
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { scope } = useScope();
  const [taskOpen, setTaskOpen] = useState(false);
  const [txnOpen, setTxnOpen] = useState(false);
  const { data: tasksAll = [] } = useTasks();
  const { data: txnsAll = [] } = useTransactions();
  const { data: accountsAll = [] } = useAccounts();
  const { data: recurrencesAll = [] } = useRecurrences();
  const goalsAll = useAllGoalsProgress();
  const upsertTask = useUpsertTask();

  // Apply scope filter to all module data
  const tasks = useMemo(() => filterByScope(tasksAll, scope), [tasksAll, scope]);
  const txns = useMemo(() => filterByScope(txnsAll, scope), [txnsAll, scope]);
  const accounts = useMemo(() => filterByScope(accountsAll, scope), [accountsAll, scope]);
  const recurrences = useMemo(() => filterByScope(recurrencesAll, scope), [recurrencesAll, scope]);
  const goals = useMemo(() => filterByScope(goalsAll, scope), [goalsAll, scope]);

  const today = todayISO();
  const monthStart = startOfMonthISO();
  const monthEnd = endOfMonthISO();

  const todayTasks = tasks.filter((t) => t.due_date === today);
  const balances = useMemo(() => balancesByScope(accounts as any, txns as any), [accounts, txns]);
  const monthFlow = useMemo(() => cashFlow(txns as any, monthStart, monthEnd), [txns, monthStart, monthEnd]);
  const proj = useMemo(
    () => projectBalance(accounts as any, txns as any, recurrences as any, monthEnd),
    [accounts, txns, recurrences, monthEnd],
  );
  const alerts = useMemo(
    () =>
      buildAlerts({
        tasks: tasks as any,
        goals: goals as any,
        txns: txns as any,
        accounts: accounts as any,
        recurrences: recurrences as any,
      }),
    [tasks, goals, txns, accounts, recurrences],
  );

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
      {/* Alertas inteligentes */}
      {alerts.length > 0 && (
        <div className="mb-6 grid sm:grid-cols-2 gap-3">
          {alerts.map((a) => {
            const Icon = a.level === "info" ? Info : AlertTriangle;
            const colorCls =
              a.level === "danger"
                ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10"
                : a.level === "warning"
                ? "border-warning/40 bg-warning/5 hover:bg-warning/10"
                : "border-border bg-muted/40 hover:bg-muted/60";
            const iconCls =
              a.level === "danger" ? "text-destructive" : a.level === "warning" ? "text-warning" : "text-muted-foreground";
            return (
              <button
                key={a.id}
                onClick={() => navigate(a.link)}
                className={`text-left p-4 rounded-lg border transition-colors flex items-start gap-3 ${colorCls}`}
              >
                <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconCls}`} />
                <div>
                  <div className="font-medium text-sm">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Saldo por escopo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <KpiCard
          label="Saldo total"
          value={formatBRL(balances.total)}
          icon={<Wallet className="h-4 w-4" />}
          accent="primary"
          onClick={() => navigate("/financeiro")}
        />
        <KpiCard
          label="Pessoal"
          value={formatBRL(balances.pessoal)}
          icon={<Wallet className="h-4 w-4" />}
          accent="pessoal"
          onClick={() => navigate("/financeiro")}
        />
        <KpiCard
          label="Profissional"
          value={formatBRL(balances.profissional)}
          icon={<Wallet className="h-4 w-4" />}
          accent="profissional"
          onClick={() => navigate("/financeiro")}
        />
      </div>

      {/* Fluxo + projeção */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <KpiCard
          label="Receitas pagas (mês)"
          value={formatBRL(monthFlow.receitas)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="success"
          onClick={() => navigate("/financeiro")}
        />
        <KpiCard
          label="Despesas pagas (mês)"
          value={formatBRL(monthFlow.despesas)}
          icon={<TrendingDown className="h-4 w-4" />}
          accent="destructive"
          onClick={() => navigate("/financeiro")}
        />
        <KpiCard
          label={monthFlow.lucro >= 0 ? "Lucro do mês" : "Prejuízo do mês"}
          value={formatBRL(Math.abs(monthFlow.lucro))}
          icon={monthFlow.lucro >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          accent={monthFlow.lucro >= 0 ? "success" : "destructive"}
          onClick={() => navigate("/financeiro")}
        />
        <KpiCard
          label="Saldo projetado (fim do mês)"
          value={formatBRL(proj.saldoProjetado)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent={proj.saldoProjetado >= balances.total ? "success" : "destructive"}
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
              Nenhuma tarefa para hoje.{" "}
              <button onClick={() => setTaskOpen(true)} className="text-accent hover:underline">
                Criar uma
              </button>
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
              <button onClick={() => navigate("/metas")} className="text-accent hover:underline">
                Criar primeira meta
              </button>
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
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{g.name}</span>
                      <ScopeBadge scope={g.scope} />
                      {g.progress.pace === "atrasada" && (
                        <span className="text-[10px] uppercase text-destructive font-semibold">atrasada</span>
                      )}
                    </div>
                    <span className="text-sm font-medium tabular-nums shrink-0">{g.progress.pct}%</span>
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
  accent: "primary" | "success" | "destructive" | "pessoal" | "profissional";
  onClick?: () => void;
}) {
  const accentColor = {
    primary: "text-foreground",
    success: "text-success",
    destructive: "text-destructive",
    pessoal: "text-pessoal",
    profissional: "text-profissional",
  }[accent];
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-lg border border-border bg-card hover:shadow-elevated transition-all gradient-card"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-2">
        <span className={accentColor}>{icon}</span>
        {label}
      </div>
      <div className={`font-display text-2xl font-semibold tabular-nums ${accentColor}`}>{value}</div>
    </button>
  );
}
