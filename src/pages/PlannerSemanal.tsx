import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PlannerNav } from "@/components/planner/PlannerNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScopeBadge } from "@/components/ScopeBadge";
import { useTasks } from "@/hooks/useData";
import { useEvents, useWeeklyPlan, useUpsertWeeklyPlan } from "@/hooks/usePlanner";
import { startOfWeekFor, addDays, weekDates, formatWeekRange, dayName, dayNumber, isToday } from "@/lib/week";
import { todayISO } from "@/lib/format";
import { ChevronLeft, ChevronRight, Plus, X, Heart, Briefcase, Activity, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

export default function PlannerSemanal() {
  const [weekStart, setWeekStart] = useState<string>(startOfWeekFor(todayISO()));
  const days = weekDates(weekStart);
  const { data: plan } = useWeeklyPlan(weekStart);
  const upsertPlan = useUpsertWeeklyPlan();
  const { data: tasks = [] } = useTasks();
  const { data: events = [] } = useEvents(days[0], days[6]);

  const [focus, setFocus] = useState("");
  const [objectives, setObjectives] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<{ text: string; done: boolean }[]>([]);
  const [balance, setBalance] = useState({ personal: "", professional: "", health: "", financial: "" });

  useEffect(() => {
    if (plan) {
      setFocus(plan.focus || "");
      setObjectives((plan.objectives as string[]) || []);
      setPriorities((plan.priorities as any[]) || []);
      setBalance({
        personal: plan.balance_personal || "",
        professional: plan.balance_professional || "",
        health: plan.balance_health || "",
        financial: plan.balance_financial || "",
      });
    } else {
      setFocus(""); setObjectives([]); setPriorities([]);
      setBalance({ personal: "", professional: "", health: "", financial: "" });
    }
  }, [plan, weekStart]);

  const save = (patch: any = {}) => {
    upsertPlan.mutate({
      week_start: weekStart,
      focus,
      objectives,
      priorities,
      balance_personal: balance.personal,
      balance_professional: balance.professional,
      balance_health: balance.health,
      balance_financial: balance.financial,
      ...patch,
    });
  };

  const addObjective = () => {
    if (objectives.length >= 5) return;
    const next = [...objectives, ""];
    setObjectives(next);
  };
  const updObjective = (i: number, v: string) => {
    const next = [...objectives]; next[i] = v; setObjectives(next);
  };
  const rmObjective = (i: number) => {
    const next = objectives.filter((_, idx) => idx !== i);
    setObjectives(next); save({ objectives: next });
  };

  const addPriority = () => setPriorities([...priorities, { text: "", done: false }]);
  const updPriority = (i: number, patch: any) => {
    const next = [...priorities]; next[i] = { ...next[i], ...patch }; setPriorities(next);
    if (patch.done !== undefined) save({ priorities: next });
  };
  const rmPriority = (i: number) => {
    const next = priorities.filter((_, idx) => idx !== i);
    setPriorities(next); save({ priorities: next });
  };

  return (
    <AppLayout
      title="Semana"
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

      {/* Foco da semana */}
      <Card className="p-5 mb-6 shadow-soft bg-gradient-to-br from-accent/5 to-transparent">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Foco da semana</label>
        <Input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          onBlur={() => save()}
          placeholder="Em que você quer focar esta semana?"
          className="border-0 shadow-none focus-visible:ring-0 text-2xl font-display py-3 px-0 mt-1"
        />
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Objetivos */}
        <Card className="p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Objetivos principais</h2>
            <Button size="sm" variant="ghost" onClick={addObjective} disabled={objectives.length >= 5}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {objectives.length === 0 && <p className="text-sm text-muted-foreground">Defina até 5 objetivos para a semana.</p>}
            {objectives.map((o, i) => (
              <div key={i} className="flex items-center gap-2 group">
                <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                <Input
                  value={o}
                  onChange={(e) => updObjective(i, e.target.value)}
                  onBlur={() => save()}
                  placeholder="Objetivo..."
                  className="border-0 border-b border-border rounded-none focus-visible:ring-0"
                />
                <button onClick={() => rmObjective(i)} className="opacity-0 group-hover:opacity-100 transition">
                  <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Prioridades */}
        <Card className="p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Prioridades</h2>
            <Button size="sm" variant="ghost" onClick={addPriority}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            {priorities.length === 0 && <p className="text-sm text-muted-foreground">Liste o que precisa acontecer sim ou sim.</p>}
            {priorities.map((p, i) => (
              <div key={i} className="flex items-center gap-2 group">
                <input
                  type="checkbox"
                  checked={p.done}
                  onChange={(e) => updPriority(i, { done: e.target.checked })}
                  className="h-4 w-4 accent-accent"
                />
                <Input
                  value={p.text}
                  onChange={(e) => updPriority(i, { text: e.target.value })}
                  onBlur={() => save()}
                  placeholder="Prioridade..."
                  className={`border-0 border-b border-border rounded-none focus-visible:ring-0 ${p.done ? "line-through text-muted-foreground" : ""}`}
                />
                <button onClick={() => rmPriority(i)} className="opacity-0 group-hover:opacity-100 transition">
                  <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Equilíbrio de vida */}
      <Card className="p-5 mb-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold mb-4">Equilíbrio de vida</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {([
            ["personal", "Pessoal", Heart],
            ["professional", "Profissional", Briefcase],
            ["health", "Saúde", Activity],
            ["financial", "Financeiro", Wallet],
          ] as const).map(([k, label, Icon]) => (
            <div key={k}>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <Icon className="h-3.5 w-3.5" /> {label}
              </label>
              <Textarea
                value={(balance as any)[k]}
                onChange={(e) => setBalance({ ...balance, [k]: e.target.value })}
                onBlur={() => save()}
                placeholder="O que vai cuidar nesta área?"
                className="text-sm min-h-[80px]"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Planejamento por dia */}
      <h2 className="font-display text-lg font-semibold mb-3">Visão da semana</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {days.map((d) => {
          const dayTasks = tasks.filter((t: any) => t.due_date === d);
          const dayEvents = events.filter((e: any) => e.date === d);
          return (
            <Link
              key={d}
              to="/planner"
              onClick={() => { /* navigate to daily; daily uses today by default. quick visualization here */ }}
              className={`block rounded-lg border p-3 hover:border-accent transition-colors ${isToday(d) ? "border-accent bg-accent/5" : "border-border bg-card"}`}
            >
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs uppercase font-medium text-muted-foreground">{dayName(d)}</span>
                <span className="font-display text-xl font-semibold">{dayNumber(d)}</span>
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((e: any) => (
                  <div key={e.id} className="text-[11px] truncate">
                    <span className="text-muted-foreground tabular-nums">{e.start_time?.slice(0, 5) || ""}</span> {e.title}
                  </div>
                ))}
                {dayTasks.slice(0, 3).map((t: any) => (
                  <div key={t.id} className={`text-[11px] truncate flex items-center gap-1 ${t.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
                    <span className="h-1 w-1 rounded-full bg-accent shrink-0" />
                    {t.title}
                  </div>
                ))}
                {dayEvents.length === 0 && dayTasks.length === 0 && <span className="text-[11px] text-muted-foreground italic">vazio</span>}
                {(dayEvents.length + dayTasks.length) > 6 && (
                  <div className="text-[10px] text-muted-foreground">+{dayEvents.length + dayTasks.length - 6}</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </AppLayout>
  );
}
