import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Activity,
  Brain,
  CheckCircle2,
  XCircle,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Loader2,
  Target,
  Wallet,
  Gauge,
  Lock,
  ArrowRight,
  Minus,
  History,
} from "lucide-react";
import {
  useAdaptiveMetrics,
  useCurrentProfile,
  useRecentAdjustments,
  useRunAdaptiveAnalysis,
  useDecideAdjustment,
  profileLabel,
  profileStyle,
  type PerformanceAdjustment,
} from "@/hooks/useAdaptive";
import {
  useAdaptiveHistory,
  useEvolutionSummary,
  useEvolutionNarrative,
  useGenerateEvolutionNarrative,
  trajectoryLabel,
  trajectoryStyle,
  type EvolutionDelta,
} from "@/hooks/useAdaptiveHistory";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDateBR } from "@/lib/format";

const areaIcon: Record<PerformanceAdjustment["area"], any> = {
  carga: Gauge,
  meta: Target,
  foco: Brain,
  financeiro: Wallet,
};

export function AdaptivePanel() {
  const metrics = useAdaptiveMetrics(7);
  const profileQ = useCurrentProfile();
  const adjustmentsQ = useRecentAdjustments();
  const run = useRunAdaptiveAnalysis();
  const decide = useDecideAdjustment();
  const navigate = useNavigate();

  const profile = profileQ.data;
  const pending = useMemo(
    () => (adjustmentsQ.data ?? []).filter((a) => a.status === "sugerido"),
    [adjustmentsQ.data],
  );

  const trend: "up" | "down" | "flat" = useMemo(() => {
    const last = metrics.daily_history.slice(-3);
    const first = metrics.daily_history.slice(0, 3);
    const lastRate =
      last.reduce((s, d) => s + (d.planned ? d.done / d.planned : 0), 0) / Math.max(last.length, 1);
    const firstRate =
      first.reduce((s, d) => s + (d.planned ? d.done / d.planned : 0), 0) /
      Math.max(first.length, 1);
    if (lastRate - firstRate > 0.1) return "up";
    if (firstRate - lastRate > 0.1) return "down";
    return "flat";
  }, [metrics.daily_history]);

  const onAccept = (adj: PerformanceAdjustment) => {
    decide.mutate({
      id: adj.id,
      decision: "aceito",
      apply: async () => {
        if (adj.area === "meta" && adj.goal_id) {
          if (adj.kind === "adiar_prazo" && adj.payload?.to_value) {
            await supabase
              .from("goals")
              .update({ deadline: String(adj.payload.to_value) })
              .eq("id", adj.goal_id);
          }
          if (adj.kind === "cortar_escopo" && Array.isArray(adj.payload?.drop_task_ids)) {
            await supabase.from("tasks").delete().in("id", adj.payload.drop_task_ids);
          }
        }
      },
    });
    toast.success("Ajuste aplicado");
  };

  const onReject = (adj: PerformanceAdjustment) => {
    decide.mutate({ id: adj.id, decision: "rejeitado" });
  };

  return (
    <Card className="p-5 mb-6 shadow-soft">
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-accent" />
          <h3 className="font-display text-lg font-semibold">IA Adaptativa</h3>
          {profile && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${profileStyle[profile.profile]} font-medium`}
            >
              {profileLabel[profile.profile]}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => run.mutate()}
          disabled={run.isPending}
        >
          {run.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Analisando...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {profile ? "Reavaliar" : "Analisar performance"}
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="atual" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="atual" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Atual
          </TabsTrigger>
          <TabsTrigger value="evolucao" className="gap-1.5">
            <History className="h-3.5 w-3.5" /> Evolução
          </TabsTrigger>
        </TabsList>

        <TabsContent value="atual" className="mt-0 space-y-4">
          {/* Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric
              label="Execução 7d"
              value={`${metrics.execution_rate}%`}
              icon={
                trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : trend === "down" ? (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                ) : (
                  <Activity className="h-3 w-3" />
                )
              }
            />
            <Metric
              label="Consistência"
              value={`${metrics.consistency_score}%`}
              accent={metrics.consistency_score < 40 ? "danger" : undefined}
            />
            <Metric
              label="Sobrecarga"
              value={`${metrics.overload_score}%`}
              accent={metrics.overload_score > 50 ? "warning" : undefined}
            />
            <Metric
              label="Carga sugerida"
              value={profile ? `${profile.recommended_load}/dia` : "—"}
            />
          </div>

          {/* Mini histórico 7 dias */}
          <div className="flex items-end gap-1 h-12 px-1">
            {metrics.daily_history.map((d) => {
              const rate = d.planned === 0 ? 0 : d.done / d.planned;
              const heightPct = Math.max(8, Math.round(rate * 100));
              const color =
                d.planned === 0
                  ? "bg-muted"
                  : rate >= 0.6
                    ? "bg-success/60"
                    : rate >= 0.3
                      ? "bg-warning/60"
                      : "bg-destructive/60";
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm ${color}`}
                    style={{ height: `${heightPct}%` }}
                    title={`${d.date}: ${d.done}/${d.planned}`}
                  />
                </div>
              );
            })}
          </div>

          {/* Narrativa semanal */}
          {profile?.narrative ? (
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm leading-relaxed">{profile.narrative}</p>
            </div>
          ) : profileQ.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-border text-sm text-muted-foreground">
              Sem análise para esta semana ainda. Clique em "Analisar performance".
            </div>
          )}

          {/* Ajustes sugeridos */}
          {pending.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Ajustes sugeridos ({pending.length})
              </div>
              {pending.map((adj) => {
                const Icon = areaIcon[adj.area] ?? Brain;
                return (
                  <div
                    key={adj.id}
                    className="p-3 rounded-lg border border-border bg-card flex gap-3 items-start"
                  >
                    <Icon className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {adj.area} · {adj.kind.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{adj.rationale}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => onAccept(adj)}
                          disabled={decide.isPending}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => onReject(adj)}
                          disabled={decide.isPending}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                        </Button>
                        {adj.area === "meta" && adj.goal_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs ml-auto"
                            onClick={() => navigate(`/metas/${adj.goal_id}`)}
                          >
                            Ver meta →
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Insights extras */}
          {profile?.insights && Object.values(profile.insights).filter(Boolean).length > 0 && (
            <div className="pt-3 border-t border-border space-y-1">
              {profile.insights.peak_window && (
                <InsightLine label="Pico" value={profile.insights.peak_window} />
              )}
              {profile.insights.risk_pattern && (
                <InsightLine label="Risco" value={profile.insights.risk_pattern} />
              )}
              {profile.insights.financial_pattern && (
                <InsightLine label="Financeiro" value={profile.insights.financial_pattern} />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="evolucao" className="mt-0">
          <EvolutionTab />
        </TabsContent>
      </Tabs>

      {/* Hint estabilidade */}
      <div className="mt-4 pt-3 border-t border-border flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" />
        Ajustes aplicam-se no início da semana e respeitam metas travadas.
      </div>
    </Card>
  );
}

/* ---------------- Aba Evolução ---------------- */

function EvolutionTab() {
  const historyQ = useAdaptiveHistory();
  const summary = useEvolutionSummary();
  const narrativeQ = useEvolutionNarrative();
  const gen = useGenerateEvolutionNarrative();

  if (historyQ.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (summary.weeks_count < 2) {
    return (
      <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-border text-sm text-muted-foreground">
        Memória de longo prazo precisa de pelo menos 2 semanas analisadas. Acumule histórico
        usando "Analisar performance" semanalmente.
      </div>
    );
  }

  const cachedNarrative = (narrativeQ.data?.payload as any)?.narrative as string | undefined;

  return (
    <div className="space-y-4">
      {/* Cabeçalho: trajetória + range */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${trajectoryStyle[summary.trajectory]}`}
          >
            {trajectoryLabel[summary.trajectory]}
          </span>
          <span className="text-xs text-muted-foreground">
            {summary.weeks_count} {summary.weeks_count === 1 ? "semana" : "semanas"} de histórico
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => gen.mutate()}
          disabled={gen.isPending}
          className="h-7 text-xs"
        >
          {gen.isPending ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Lendo evolução...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3 mr-1" /> {cachedNarrative ? "Reavaliar evolução" : "Ler evolução"}
            </>
          )}
        </Button>
      </div>

      {/* Narrativa de evolução */}
      {cachedNarrative ? (
        <div className="p-3 rounded-lg bg-accent/5 border border-accent/30">
          <p className="text-sm leading-relaxed">{cachedNarrative}</p>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-border text-sm text-muted-foreground">
          Clique em "Ler evolução" para a IA comparar suas últimas semanas.
        </div>
      )}

      {/* Deltas: atual vs 4 sem atrás */}
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
          Atual vs 4 semanas atrás
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summary.deltas.map((d) => (
            <DeltaCard key={d.label} delta={d} />
          ))}
        </div>
      </div>

      {/* Sparkline 12 sem */}
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
          Execução nas últimas {summary.trend12.length} semanas
        </div>
        <Sparkline data={summary.trend12} />
      </div>

      {/* Best/Worst + mudança de perfil */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
        {summary.best && (
          <div className="text-xs">
            <span className="uppercase tracking-wider text-muted-foreground font-semibold">
              Melhor semana
            </span>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-display text-lg font-semibold tabular-nums text-success">
                {summary.best.execution_rate}%
              </span>
              <span className="text-muted-foreground">{formatDateBR(summary.best.week_start)}</span>
            </div>
          </div>
        )}
        {summary.worst && (
          <div className="text-xs">
            <span className="uppercase tracking-wider text-muted-foreground font-semibold">
              Pior semana
            </span>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-display text-lg font-semibold tabular-nums text-destructive">
                {summary.worst.execution_rate}%
              </span>
              <span className="text-muted-foreground">{formatDateBR(summary.worst.week_start)}</span>
            </div>
          </div>
        )}
      </div>

      {summary.profileChanged && summary.current && summary.fourWeeksAgo && (
        <div className="p-2.5 rounded-lg border border-primary/30 bg-primary/5 flex items-center gap-2 text-xs">
          <ArrowRight className="h-3.5 w-3.5 text-primary" />
          <span>
            Perfil mudou:{" "}
            <strong>{profileLabel[summary.fourWeeksAgo.profile]}</strong> →{" "}
            <strong>{profileLabel[summary.current.profile]}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

function DeltaCard({ delta }: { delta: EvolutionDelta }) {
  const Icon =
    delta.direction === "up"
      ? TrendingUp
      : delta.direction === "down"
        ? TrendingDown
        : Minus;
  const color = delta.positive
    ? "text-success"
    : delta.direction === "flat"
      ? "text-muted-foreground"
      : "text-destructive";
  return (
    <div className="p-2.5 rounded-lg border border-border bg-card">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        {delta.label}
      </div>
      <div className="font-display text-xl font-semibold tabular-nums">{delta.current}%</div>
      <div className={`flex items-center gap-1 text-[11px] mt-0.5 ${color}`}>
        <Icon className="h-3 w-3" />
        {delta.delta > 0 ? "+" : ""}
        {delta.delta}pp vs {delta.previous}%
      </div>
    </div>
  );
}

function Sparkline({
  data,
}: {
  data: { week_start: string; execution_rate: number }[];
}) {
  if (data.length === 0) return null;
  const max = Math.max(100, ...data.map((d) => Number(d.execution_rate)));
  return (
    <div className="flex items-end gap-1 h-16 px-1">
      {data.map((d) => {
        const v = Number(d.execution_rate);
        const heightPct = Math.max(6, Math.round((v / max) * 100));
        const color =
          v >= 70 ? "bg-success/70" : v >= 50 ? "bg-warning/70" : "bg-destructive/70";
        return (
          <div
            key={d.week_start}
            className="flex-1 flex flex-col items-center justify-end gap-1"
            title={`${formatDateBR(d.week_start)}: ${v}%`}
          >
            <div
              className={`w-full rounded-sm ${color} transition-all`}
              style={{ height: `${heightPct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: "warning" | "danger";
}) {
  const cls =
    accent === "danger"
      ? "text-destructive"
      : accent === "warning"
        ? "text-warning"
        : "text-foreground";
  return (
    <div className="p-2.5 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        {icon} {label}
      </div>
      <div className={`font-display text-xl font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function InsightLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs flex gap-2">
      <span className="uppercase tracking-wider text-muted-foreground font-semibold w-20 shrink-0">
        {label}
      </span>
      <span className="flex-1">{value}</span>
    </div>
  );
}
