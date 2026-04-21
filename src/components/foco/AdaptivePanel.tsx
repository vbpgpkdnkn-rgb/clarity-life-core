import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
        // Aplicação concreta de cada tipo de ajuste
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
        // 'reduzir_carga'/'aumentar_carga'/'ajuste_foco'/'alerta_gasto':
        // o efeito é o registro do ajuste em si (orienta o Modo Foco e revisões).
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

      {/* Métricas determinísticas (sempre visíveis) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
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
      <div className="flex items-end gap-1 h-12 mb-4 px-1">
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

      {/* Narrativa */}
      {profile?.narrative ? (
        <div className="p-3 rounded-lg bg-muted/30 border border-border mb-4">
          <p className="text-sm leading-relaxed">{profile.narrative}</p>
        </div>
      ) : profileQ.isLoading ? (
        <Skeleton className="h-16 w-full mb-4" />
      ) : (
        <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-border mb-4 text-sm text-muted-foreground">
          Sem análise para esta semana ainda. Clique em "Analisar performance" para gerar perfil e ajustes sugeridos.
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
        <div className="mt-4 pt-3 border-t border-border space-y-1">
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

      {/* Hint estabilidade */}
      <div className="mt-4 pt-3 border-t border-border flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" />
        Ajustes aplicam-se no início da semana e respeitam metas travadas.
      </div>
    </Card>
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
