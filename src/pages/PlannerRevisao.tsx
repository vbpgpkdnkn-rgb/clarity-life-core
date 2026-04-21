import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PlannerNav } from "@/components/planner/PlannerNav";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTasks, useTransactions } from "@/hooks/useData";
import { useWeeklyReview, useUpsertWeeklyReview } from "@/hooks/usePlanner";
import { useAllGoalsProgress } from "@/hooks/useGoalProgress";
import { startOfWeekFor, addDays, weekDates, formatWeekRange } from "@/lib/week";
import { todayISO, formatBRL } from "@/lib/format";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CheckCircle2, Target } from "lucide-react";

export default function PlannerRevisao() {
  const [weekStart, setWeekStart] = useState<string>(startOfWeekFor(todayISO()));
  const days = weekDates(weekStart);
  const { data: review } = useWeeklyReview(weekStart);
  const upsert = useUpsertWeeklyReview();
  const { data: tasks = [] } = useTasks();
  const { data: txns = [] } = useTransactions();
  const goals = useAllGoalsProgress();

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

  // Dados automáticos
  const stats = useMemo(() => {
    const weekTasks = tasks.filter((t: any) => t.due_date && t.due_date >= days[0] && t.due_date <= days[6]);
    const done = weekTasks.filter((t: any) => t.status === "concluida").length;
    const pct = weekTasks.length ? Math.round((done / weekTasks.length) * 100) : 0;

    const weekTxns = txns.filter((t: any) => t.date >= days[0] && t.date <= days[6] && t.status === "pago");
    const receita = weekTxns.filter((t: any) => t.type === "entrada").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const despesa = weekTxns.filter((t: any) => t.type === "saida").reduce((s: number, t: any) => s + Number(t.amount), 0);

    return { weekTasks: weekTasks.length, done, pct, receita, despesa, saldo: receita - despesa };
  }, [tasks, txns, days]);

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

      {/* Dados automáticos */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 shadow-soft">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Tarefas concluídas
          </div>
          <div className="font-display text-2xl font-semibold">{stats.pct}%</div>
          <div className="text-xs text-muted-foreground">{stats.done} de {stats.weekTasks}</div>
        </Card>
        <Card className="p-4 shadow-soft">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp className="h-3.5 w-3.5" /> Receita
          </div>
          <div className="font-display text-xl font-semibold tabular-nums">{formatBRL(stats.receita)}</div>
        </Card>
        <Card className="p-4 shadow-soft">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingDown className="h-3.5 w-3.5" /> Despesas
          </div>
          <div className="font-display text-xl font-semibold tabular-nums">{formatBRL(stats.despesa)}</div>
        </Card>
        <Card className="p-4 shadow-soft">
          <div className="text-muted-foreground text-xs mb-1">Saldo da semana</div>
          <div className={`font-display text-xl font-semibold tabular-nums ${stats.saldo < 0 ? "text-destructive" : "text-accent"}`}>
            {formatBRL(stats.saldo)}
          </div>
        </Card>
      </div>

      {/* Metas em andamento */}
      {goals.length > 0 && (
        <Card className="p-5 mb-6 shadow-soft">
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" /> Progresso das metas
          </h2>
          <div className="space-y-2">
            {goals.slice(0, 5).map((g: any) => (
              <div key={g.id} className="flex items-center gap-3">
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
          <Slider label="Nota da semana" value={form.rating} max={10} suffix="/10" onChange={(v) => { setForm({ ...form, rating: v }); }} onCommit={save} />
          <Slider label="Produtividade" value={form.productivity} max={100} suffix="%" onChange={(v) => { setForm({ ...form, productivity: v }); }} onCommit={save} />
          <Slider label="Consistência" value={form.consistency} max={100} suffix="%" onChange={(v) => { setForm({ ...form, consistency: v }); }} onCommit={save} />
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
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
        className="w-full accent-accent"
      />
    </div>
  );
}
