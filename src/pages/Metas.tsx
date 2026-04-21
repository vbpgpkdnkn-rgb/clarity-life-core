import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScopeBadge } from "@/components/ScopeBadge";
import { GoalFormDrawer } from "@/components/forms/GoalFormDrawer";
import { useAllGoalsProgress } from "@/hooks/useGoalProgress";
import { useScope, filterByScope } from "@/contexts/ScopeContext";
import { formatBRL, formatDateBR, todayISO } from "@/lib/format";
import { Plus, Target, Trophy, AlertCircle, Pause, TrendingUp, Lock } from "lucide-react";

export default function Metas() {
  const navigate = useNavigate();
  const goals = useAllGoalsProgress();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filter, setFilter] = useState<"todos" | "pessoal" | "profissional">("todos");

  const filtered = goals.filter((g) => filter === "todos" || g.scope === filter);

  const stats = useMemo(() => {
    const ativas = filtered.filter((g) => g.status === "ativa");
    const concluidas = filtered.filter((g) => g.status === "concluida" || g.progress.pct >= 100);
    const atrasadas = ativas.filter((g) => g.progress.pace === "atrasada");
    const noRitmo = ativas.filter((g) => g.progress.pace === "ok");
    const avgProgress = ativas.length
      ? Math.round(ativas.reduce((s, g) => s + g.progress.pct, 0) / ativas.length)
      : 0;
    const taxaAtingimento = filtered.length
      ? Math.round((concluidas.length / filtered.length) * 100)
      : 0;
    return {
      ativas: ativas.length,
      concluidas: concluidas.length,
      atrasadas: atrasadas.length,
      noRitmo: noRitmo.length,
      avgProgress,
      taxaAtingimento,
    };
  }, [filtered]);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openDetail = (g: any) => {
    navigate(`/metas/${g.id}`);
  };

  return (
    <AppLayout
      title="Metas"
      subtitle="Acompanhamento real do que importa"
      action={
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Meta
        </Button>
      }
    >
      {/* Filtro global de escopo está no header */}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <StatCard label="Atingimento" value={`${stats.taxaAtingimento}%`} icon={<Trophy className="h-4 w-4 text-success" />} />
        <StatCard label="Progresso médio" value={`${stats.avgProgress}%`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="No ritmo" value={String(stats.noRitmo)} icon={<Target className="h-4 w-4 text-success" />} />
        <StatCard label="Atrasadas" value={String(stats.atrasadas)} icon={<AlertCircle className="h-4 w-4 text-destructive" />} highlight={stats.atrasadas > 0} />
        <StatCard label="Concluídas" value={String(stats.concluidas)} icon={<Trophy className="h-4 w-4" />} />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center shadow-soft">
          <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display text-xl mb-2">Comece pela sua primeira meta</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Defina metas por tarefas, valor financeiro, marcos ou híbridas. O progresso é calculado automaticamente.
          </p>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Criar meta
          </Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g) => (
            <GoalCard key={g.id} goal={g} onClick={() => openDetail(g)} />
          ))}
        </div>
      )}

      <GoalFormDrawer open={open} onOpenChange={setOpen} goal={editing} />
    </AppLayout>
  );
}

function GoalCard({ goal, onClick }: { goal: any; onClick: () => void }) {
  const isOverdue = goal.progress.pace === "atrasada";
  const isDone = goal.progress.pace === "concluida";

  const progressLabel = useMemo(() => {
    if (goal.progress.detail) return goal.progress.detail;
    if ((goal.kind === "financeiro" || goal.kind === "hibrida") && goal.progress.target) {
      return `${formatBRL(goal.progress.current)} de ${formatBRL(goal.progress.target)}`;
    }
    return null;
  }, [goal]);

  return (
    <button
      onClick={onClick}
      className={`text-left p-5 rounded-lg border bg-card hover:shadow-elevated transition-all w-full ${
        isOverdue ? "border-destructive/40" : "border-border"
      } ${goal.scope === "pessoal" ? "gradient-warm" : "gradient-cool"}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <ScopeBadge scope={goal.scope} />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{goal.kind}</span>
          {goal.status === "pausada" && <Pause className="h-3 w-3 text-muted-foreground" />}
          {(goal as any).locked && (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground" title="Meta travada — IA não vai ajustar">
              <Lock className="h-2.5 w-2.5" /> Travada
            </span>
          )}
        </div>
        {isDone && <Trophy className="h-4 w-4 text-success" />}
        {isOverdue && <AlertCircle className="h-4 w-4 text-destructive" />}
      </div>
      <h3 className="font-display text-lg font-semibold mb-1 line-clamp-2">{goal.name}</h3>
      {progressLabel && <p className="text-xs text-muted-foreground mb-3 tabular-nums">{progressLabel}</p>}
      <div className="flex items-center gap-2 mb-2">
        <Progress value={goal.progress.pct} className="h-2 flex-1" />
        <span className="text-sm font-semibold tabular-nums w-10 text-right">{goal.progress.pct}%</span>
      </div>
      {goal.deadline && (
        <p className={`text-xs mt-2 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
          Prazo: {formatDateBR(goal.deadline)}
          {goal.progress.pace === "atrasada" && goal.progress.paceDelta < 0 && (
            <> · {Math.abs(Math.round(goal.progress.paceDelta))}% abaixo do esperado</>
          )}
        </p>
      )}
    </button>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={`p-4 shadow-soft ${highlight ? "border-destructive/40" : ""}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-2">
        {icon} {label}
      </div>
      <div className="font-display text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}
