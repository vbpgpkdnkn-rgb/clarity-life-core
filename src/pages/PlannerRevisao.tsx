import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PlannerNav } from "@/components/planner/PlannerNav";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScopeBadge } from "@/components/ScopeBadge";
import { useTasks, useTransactions } from "@/hooks/useData";
import { useWeeklyReview, useUpsertWeeklyReview } from "@/hooks/usePlanner";
import { useAllGoalsProgress } from "@/hooks/useGoalProgress";
import { useScope, filterByScope } from "@/contexts/ScopeContext";
import { startOfWeekFor, addDays, weekDates, formatWeekRange } from "@/lib/week";
import { todayISO, formatBRL } from "@/lib/format";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CheckCircle2, Target } from "lucide-react";

export default function PlannerRevisao() {
  const [weekStart, setWeekStart] = useState<string>(startOfWeekFor(todayISO()));
  const { scope } = useScope();
  const days = weekDates(weekStart);
  const { data: review } = useWeeklyReview(weekStart);
  const upsert = useUpsertWeeklyReview();
  const { data: tasksAll = [] } = useTasks();
  const { data: txnsAll = [] } = useTransactions();
  const goalsAll = useAllGoalsProgress();

  // Aplica filtro global
  const tasks = filterByScope(tasksAll, scope);
  const txns = filterByScope(txnsAll, scope);
  const goals = filterByScope(goalsAll, scope);

  const [form, setForm] = useState({
    what_worked: "", what_didnt: "", biggest_lesson: "", biggest_mistake: "",
    rating: 7, productivity: 70, consistency: 70,
    next_week_changes: "", important_decisions: "",
  });

  useEffect(() => {
    if (review) {
      setForm({
        what_worked: review.what_worked || "",
        what_didnt: review.what_didnt || "",
        biggest_lesson: review.biggest_lesson || "",
        biggest_mistake: review.biggest_mistake || "",
        rating: review.rating ?? 7,
        productivity: review.productivity ?? 70,
        consistency: review.consistency ?? 70,
        next_week_changes: review.next_week_changes || "",
        important_decisions: review.important_decisions || "",
      });
    } else {
      setForm({
        what_worked: "", what_didnt: "", biggest_lesson: "", biggest_mistake: "",
        rating: 7, productivity: 70, consistency: 70,
        next_week_changes: "", important_decisions: "",
      });
    }
  }, [review, weekStart]);

  const save = () => upsert.mutate({ week_start: weekStart, ...form });

  // Calcula stats por escopo
  const computeStats = (s: "pessoal" | "profissional" | "todos") => {
    const t = s === "todos" ? tasks : tasks.filter((x: any) => x.scope === s);
    const x = s === "todos" ? txns : txns.filter((y: any) => y.scope === s);
    const g = s === "todos" ? goals : goals.filter((y: any) => y.scope === s);
    const weekTasks = t.filter((tk: any) => tk.due_date && tk.due_date >= days[0] && tk.due_date <= days[6]);
    const done = weekTasks.filter((tk: any) => tk.status === "concluida").length;
    const pct = weekTasks.length ? Math.round((done / weekTasks.length) * 100) : 0;
    const weekTxns = x.filter((tx: any) => tx.date >= days[0] && tx.date <= days[6] && tx.status === "pago");
    const receita = weekTxns.filter((tx: any) => tx.type === "entrada").reduce((s: number, tx: any) => s + Number(tx.amount), 0);
    const despesa = weekTxns.filter((tx: any) => tx.type === "saida").reduce((s: number, tx: any) => s + Number(tx.amount), 0);
    const goalsPct = g.length ? Math.round(g.reduce((s: number, gg: any) => s + (gg.progress?.pct || 0), 0) / g.length) : 0;
    return { tarefas: weekTasks.length, done, pct, receita, despesa, saldo: receita - despesa, goalsPct, goalsCount: g.length };
  };

  const personal = useMemo(() => computeStats("pessoal"), [tasks, txns, goals, days]);
  const professional = useMemo(() => computeStats("profissional"), [tasks, txns, goals, days]);

  return (
    <AppLayout
      title="Revisão semanal"
      subtitle={formatWeekRange(weekStart)}
      action={
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeekFor(todayISO()))}>Esta semana</Button>
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      }
    >
      <PlannerNav />

      {/* KPIs separados Pessoal × Profissional */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <ScopeBlock label="Pessoal" stats={personal} variant="pessoal" />
        <ScopeBlock label="Profissional" stats={professional} variant="profissional" />
      </div>

      {/* Metas */}
      {goals.length > 0 && (
        <Card className="p-5 mb-6 shadow-soft">
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" /> Progresso das metas
          </h2>
          <div className="space-y-2">
            {goals.slice(0, 6).map((g: any) => (
              <div key={g.id} className="flex items-center gap-3">
                <ScopeBadge scope={g.scope} />
                <span className="text-sm flex-1 truncate">{g.name}</span>
                <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${g.progress?.pct || 0}%` }} />
                </div>
                <span className="text-xs tabular-nums w-10 text-right">{g.progress?.pct || 0}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Reflexão */}
      <Card className="p-5 mb-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold mb-4">Reflexão</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="O que funcionou bem" value={form.what_worked} onChange={(v) => setForm({ ...form, what_worked: v })} onBlur={save} />
          <Field label="O que não funcionou" value={form.what_didnt} onChange={(v) => setForm({ ...form, what_didnt: v })} onBlur={save} />
          <Field label="Maior aprendizado" value={form.biggest_lesson} onChange={(v) => setForm({ ...form, biggest_lesson: v })} onBlur={save} />
          <Field label="Maior erro" value={form.biggest_mistake} onChange={(v) => setForm({ ...form, biggest_mistake: v })} onBlur={save} />
        </div>
      </Card>

      {/* Avaliação */}
      <Card className="p-5 mb-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold mb-4">Avaliação</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <Slider label="Nota da semana" value={form.rating} max={10} suffix="/10" onChange={(v: number) => setForm({ ...form, rating: v })} onCommit={save} />
          <Slider label="Produtividade" value={form.productivity} max={100} suffix="%" onChange={(v: number) => setForm({ ...form, productivity: v })} onCommit={save} />
          <Slider label="Consistência" value={form.consistency} max={100} suffix="%" onChange={(v: number) => setForm({ ...form, consistency: v })} onCommit={save} />
        </div>
      </Card>

      {/* Ajustes */}
      <Card className="p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold mb-4">Ajustes</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="O que mudar na próxima semana" value={form.next_week_changes} onChange={(v) => setForm({ ...form, next_week_changes: v })} onBlur={save} />
          <Field label="Decisões importantes" value={form.important_decisions} onChange={(v) => setForm({ ...form, important_decisions: v })} onBlur={save} />
        </div>
      </Card>
    </AppLayout>
  );
}

function ScopeBlock({ label, stats, variant }: { label: string; stats: any; variant: "pessoal" | "profissional" }) {
  const accent = variant === "pessoal" ? "text-pessoal" : "text-profissional";
  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-display text-lg font-semibold ${accent}`}>{label}</h3>
        <ScopeBadge scope={variant} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Tarefas" value={`${stats.pct}%`} sub={`${stats.done}/${stats.tarefas}`} />
        <Stat icon={<Target className="h-3.5 w-3.5" />} label="Metas (média)" value={`${stats.goalsPct}%`} sub={`${stats.goalsCount} metas`} />
        <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Receita" value={formatBRL(stats.receita)} />
        <Stat icon={<TrendingDown className="h-3.5 w-3.5" />} label="Despesas" value={formatBRL(stats.despesa)} />
      </div>
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Resultado da semana</span>
        <span className={`font-display text-lg tabular-nums ${stats.saldo < 0 ? "text-destructive" : "text-success"}`}>
          {formatBRL(stats.saldo)}
        </span>
      </div>
    </Card>
  );
}

function Stat({ icon, label, value, sub }: any) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide">{icon} {label}</div>
      <div className="font-display text-lg font-semibold tabular-nums mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Field({ label, value, onChange, onBlur }: any) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className="min-h-[100px] text-sm" />
    </div>
  );
}

function Slider({ label, value, max, suffix, onChange, onCommit }: any) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <span className="font-display text-xl font-semibold tabular-nums">{value}{suffix}</span>
      </div>
      <input type="range" min={0} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={onCommit} onTouchEnd={onCommit}
        className="w-full accent-accent" />
    </div>
  );
}
