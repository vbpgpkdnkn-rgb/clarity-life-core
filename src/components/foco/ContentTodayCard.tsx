import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clapperboard, ChevronRight, AlertCircle, Flame, CalendarDays, CheckCircle2, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTodayContent, useContentConsistency } from "@/hooks/useContent";
import { useStoriesConsistency, useConsistencyAlerts } from "@/hooks/useStoriesAndReferences";
import { currentWeekStart, dayISOFromWeekday, useEditorialLine } from "@/hooks/useEditorialLine";
import { useScope } from "@/contexts/ScopeContext";
import { formatDateBR, todayISO } from "@/lib/format";

const WEEKDAY_SHORT: Record<string, string> = {
  segunda: "seg", terca: "ter", quarta: "qua", quinta: "qui", sexta: "sex", sabado: "sáb", domingo: "dom",
};

export function ContentTodayCard() {
  const navigate = useNavigate();
  const { scope } = useScope();
  const { dueToday, next } = useTodayContent();
  const consistency = useContentConsistency(scope === "todos" ? undefined : (scope as any));
  const stories = useStoriesConsistency(scope === "todos" ? undefined : (scope as any), 7);
  const alerts = useConsistencyAlerts(scope === "todos" ? undefined : (scope as any));
  const weekStart = currentWeekStart();
  const { data: editorialLine } = useEditorialLine(weekStart);
  const today = todayISO();

  const upcomingLine = editorialLine?.plan?.days?.filter((d) => dayISOFromWeekday(weekStart, d.weekday) >= today).slice(0, 4) ?? [];
  const hasAnything = dueToday.length > 0 || stories.todayPlanned > 0 || alerts.length > 0 || consistency.publishedCount > 0 || upcomingLine.length > 0;
  if (!hasAnything) return null;

  return (
    <Card className="p-4 mb-4 border-accent/30 bg-accent/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-accent" />
          <h3 className="font-display font-semibold text-sm">Conteúdo hoje</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/conteudo")}>
          Ver tudo <ChevronRight className="h-3 w-3 ml-0.5" />
        </Button>
      </div>

      {/* Alertas críticos */}
      {alerts.filter((a) => a.level !== "info").slice(0, 2).map((a, i) => (
        <div
          key={i}
          className={`mb-2 p-2 rounded-md border text-xs flex items-start gap-2 ${
            a.level === "critical"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-warning/30 bg-warning/5 text-warning"
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">{a.message}</div>
            <div className="opacity-80">{a.action}</div>
          </div>
        </div>
      ))}

      {/* Posts urgentes hoje */}
      {dueToday.length > 0 && (
        <div className="space-y-2">
          {dueToday.slice(0, 3).map((p) => (
            <button
              key={p.id}
              onClick={() => navigate("/conteudo")}
              className="block w-full text-left p-2 rounded border border-border bg-card hover:border-primary/50"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{p.title}</div>
                <Badge variant="outline" className="text-[10px]">{p.format}</Badge>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {p.status === "pronto" ? "Pronto para publicar" : `Planejado ${p.planned_date ? formatDateBR(p.planned_date) : ""}`}
              </div>
            </button>
          ))}
        </div>
      )}

      {dueToday.length === 0 && next && (
        <p className="text-xs text-muted-foreground">
          Próximo post: <span className="text-foreground">{next.title}</span> ({formatDateBR(next.planned_date!)})
        </p>
      )}

      {upcomingLine.length > 0 && (
        <div className="mt-3 rounded-md border border-border bg-card/70 p-2">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="h-3 w-3" /> Linha editorial da semana
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {upcomingLine.map((day) => {
              const date = dayISOFromWeekday(weekStart, day.weekday);
              const filled = dueToday.some((p) => p.planned_date === date) || next?.planned_date === date;
              return (
                <button key={day.weekday} onClick={() => navigate("/conteudo")} className="flex items-start gap-1.5 rounded border border-border/70 p-1.5 text-left hover:border-primary/40">
                  {filled ? <CheckCircle2 className="mt-0.5 h-3 w-3 text-success" /> : <Circle className="mt-0.5 h-3 w-3 text-muted-foreground" />}
                  <span className="min-w-0">
                    <span className="block text-[10px] uppercase text-muted-foreground">{WEEKDAY_SHORT[day.weekday]}</span>
                    <span className="block truncate text-[11px] font-medium">{day.suggestion}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Indicadores de consistência */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border text-center">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Posts/sem</div>
          <div className="text-sm font-medium tabular-nums">
            {consistency.publishedCount}/{consistency.targetPerWeek}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Stories hoje</div>
          <div className="text-sm font-medium tabular-nums">
            {stories.todayDone}/{Math.max(stories.todayPlanned, 1)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-0.5">
            <Flame className="h-2.5 w-2.5 text-warning" /> Streak
          </div>
          <div className="text-sm font-medium tabular-nums">{stories.streak}d</div>
        </div>
      </div>
    </Card>
  );
}
