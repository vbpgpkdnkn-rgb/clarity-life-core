import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  X,
  AlertTriangle,
  Scale,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScopeFilterToggle } from "@/components/ScopeFilterToggle";
import { useScope } from "@/contexts/ScopeContext";
import { formatBRL } from "@/lib/format";
import {
  useAnnualData,
  useAnnualTotals,
  useMonthlyReviews,
  useGenerateMonthlyReview,
  healthLabel,
  healthStyle,
  type AnnualMonth,
} from "@/hooks/useAnnualData";

export default function VisaoAnual() {
  const { scope } = useScope();
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: months, isLoading } = useAnnualData(year);
  const totals = useAnnualTotals(months);
  const reviewsQ = useMonthlyReviews(year);

  const [openMonth, setOpenMonth] = useState<AnnualMonth | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]); // months 1..12

  const compareMonths = useMemo(
    () => compareIds.map((m) => months.find((x) => x.month === m)).filter(Boolean) as AnnualMonth[],
    [compareIds, months],
  );

  const toggleCompare = (m: AnnualMonth) => {
    setCompareIds((prev) => {
      if (prev.includes(m.month)) return prev.filter((x) => x !== m.month);
      if (prev.length >= 3) return prev;
      return [...prev, m.month].sort((a, b) => a - b);
    });
  };

  const onCardClick = (m: AnnualMonth) => {
    if (compareMode) toggleCompare(m);
    else setOpenMonth(m);
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <CalendarRange className="h-3.5 w-3.5" />
              CENTRAL ESTRATÉGICA
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Visão Anual</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {scope === "todos"
                ? "Pessoal + Profissional"
                : scope === "pessoal"
                  ? "Pessoal"
                  : "Profissional"}
              {" · "}
              {months.filter((m) => !m.is_future).length} meses com dados
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ScopeFilterToggle />
            <div className="flex items-center gap-1 border border-border rounded-md p-0.5 bg-card">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setYear((y) => y - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-display font-semibold text-base px-2 tabular-nums">{year}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setYear((y) => y + 1)}
                disabled={year >= new Date().getFullYear() + 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setCompareMode((v) => !v);
                if (compareMode) setCompareIds([]);
              }}
            >
              <Scale className="h-3.5 w-3.5 mr-1" />
              {compareMode ? `Comparar (${compareIds.length}/3)` : "Comparar meses"}
            </Button>
          </div>
        </div>

        {/* Totais anuais */}
        <Card className="p-5 shadow-soft">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Total label="Execução" value={`${totals.execution_rate}%`} icon={<Activity className="h-3 w-3" />} />
            <Total label="Concluídas" value={`${totals.done}/${totals.planned}`} />
            <Total label="Receita" value={formatBRL(totals.receita)} accent="success" />
            <Total label="Despesa" value={formatBRL(totals.despesa)} accent="danger" />
            <Total
              label="Lucro"
              value={formatBRL(totals.lucro)}
              accent={totals.lucro >= 0 ? "success" : "danger"}
              icon={<Wallet className="h-3 w-3" />}
            />
          </div>
          {/* Sparkline lucro mensal */}
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
              Lucro mês a mês
            </div>
            <YearSparkline months={months} />
          </div>
        </Card>

        {/* Grid 12 meses */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {months.map((m) => (
              <MonthCard
                key={m.month}
                month={m}
                onClick={() => onCardClick(m)}
                selected={compareMode && compareIds.includes(m.month)}
                hasReview={reviewsQ.data?.has(`${m.year}-${String(m.month).padStart(2, "0")}`)}
                compareMode={compareMode}
              />
            ))}
          </div>
        )}

        {/* Painel de comparação */}
        {compareMode && compareMonths.length >= 2 && (
          <ComparePanel months={compareMonths} onClose={() => setCompareIds([])} />
        )}
      </div>

      {/* Drawer detalhe */}
      <Sheet open={!!openMonth} onOpenChange={(o) => !o && setOpenMonth(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {openMonth && (
            <MonthDetail
              month={openMonth}
              review={reviewsQ.data?.get(`${openMonth.year}-${String(openMonth.month).padStart(2, "0")}`)}
            />
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

/* ---------------- Components ---------------- */

function Total({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: "success" | "danger";
}) {
  const cls =
    accent === "success" ? "text-success" : accent === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        {icon} {label}
      </div>
      <div className={`font-display text-2xl font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function MonthCard({
  month,
  onClick,
  selected,
  hasReview,
  compareMode,
}: {
  month: AnnualMonth;
  onClick: () => void;
  selected: boolean;
  hasReview?: boolean;
  compareMode: boolean;
}) {
  const isFuture = month.is_future;
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border transition-all bg-card hover:shadow-soft hover:-translate-y-0.5 ${
        selected
          ? "border-primary ring-2 ring-primary/30"
          : month.is_current
            ? "border-accent/60"
            : "border-border"
      } ${isFuture ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {String(month.month).padStart(2, "0")}/{String(month.year).slice(2)}
          </div>
          <div className="font-display text-lg font-semibold leading-tight">{month.label}</div>
        </div>
        {!isFuture && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${healthStyle[month.health]}`}
          >
            {healthLabel[month.health]}
          </span>
        )}
        {month.is_current && !compareMode && (
          <Badge variant="outline" className="text-[9px] h-4 px-1 border-accent text-accent">
            atual
          </Badge>
        )}
      </div>

      {isFuture ? (
        <div className="text-xs text-muted-foreground">Mês futuro</div>
      ) : (
        <div className="space-y-2">
          <Row
            label="Execução"
            value={`${month.execution.rate}%`}
            sub={`${month.execution.done}/${month.execution.planned}`}
            color={
              month.execution.planned === 0
                ? "muted"
                : month.execution.rate >= 70
                  ? "success"
                  : month.execution.rate >= 50
                    ? "warning"
                    : "danger"
            }
          />
          <Row
            label="Lucro"
            value={formatBRL(month.financial.lucro)}
            color={
              month.financial.receita + month.financial.despesa === 0
                ? "muted"
                : month.financial.lucro >= 0
                  ? "success"
                  : "danger"
            }
          />
          <Row
            label="Metas"
            value={`${month.goals.concluidas}/${month.goals.total}`}
            sub={month.goals.atrasadas > 0 ? `${month.goals.atrasadas} atrasadas` : undefined}
            color={month.goals.atrasadas > 0 ? "warning" : "muted"}
          />
        </div>
      )}

      {!isFuture && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <div className="flex gap-1">
            {month.alerts.slice(0, 3).map((a, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  a.level === "danger" ? "bg-destructive" : a.level === "warning" ? "bg-warning" : "bg-primary"
                }`}
                title={a.title}
              />
            ))}
            {month.alerts.length === 0 && (
              <span className="text-[10px] text-muted-foreground">sem alertas</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasReview && <Sparkles className="h-3 w-3 text-accent" />}
            {selected && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
          </div>
        </div>
      )}
    </button>
  );
}

function Row({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: "success" | "warning" | "danger" | "muted";
}) {
  const colorCls = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    muted: "text-foreground",
  }[color];
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold tabular-nums ${colorCls}`}>{value}</span>
        {sub && <span className="ml-1 text-[10px] text-muted-foreground">· {sub}</span>}
      </div>
    </div>
  );
}

function YearSparkline({ months }: { months: AnnualMonth[] }) {
  const values = months.map((m) => m.financial.lucro);
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));
  return (
    <div className="flex items-center gap-1 h-14">
      {months.map((m) => {
        const v = m.financial.lucro;
        const heightPct = Math.max(4, Math.round((Math.abs(v) / max) * 50));
        const isPos = v >= 0;
        const color =
          v === 0 ? "bg-muted" : isPos ? "bg-success/70" : "bg-destructive/70";
        return (
          <div
            key={m.month}
            className="flex-1 flex flex-col items-center justify-center"
            title={`${m.label}: ${formatBRL(v)}`}
          >
            <div className="h-1/2 flex items-end w-full">
              {isPos && (
                <div
                  className={`w-full rounded-t-sm ${color}`}
                  style={{ height: `${heightPct * 2}%` }}
                />
              )}
            </div>
            <div className="h-px w-full bg-border" />
            <div className="h-1/2 flex items-start w-full">
              {!isPos && v < 0 && (
                <div
                  className={`w-full rounded-b-sm ${color}`}
                  style={{ height: `${heightPct * 2}%` }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ComparePanel({ months, onClose }: { months: AnnualMonth[]; onClose: () => void }) {
  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg font-semibold">Comparação</h3>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="h-3.5 w-3.5 mr-1" /> Limpar
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-2">Métrica</th>
              {months.map((m) => (
                <th key={m.month} className="py-2 px-2 font-semibold text-foreground">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <CompareRow label="Execução" months={months} get={(m) => `${m.execution.rate}%`} />
            <CompareRow
              label="Concluídas"
              months={months}
              get={(m) => `${m.execution.done}/${m.execution.planned}`}
            />
            <CompareRow
              label="Dias produtivos"
              months={months}
              get={(m) => String(m.execution.productive_days)}
            />
            <CompareRow label="Receita" months={months} get={(m) => formatBRL(m.financial.receita)} />
            <CompareRow label="Despesa" months={months} get={(m) => formatBRL(m.financial.despesa)} />
            <CompareRow label="Lucro" months={months} get={(m) => formatBRL(m.financial.lucro)} />
            <CompareRow label="Metas concluídas" months={months} get={(m) => String(m.goals.concluidas)} />
            <CompareRow label="Metas atrasadas" months={months} get={(m) => String(m.goals.atrasadas)} />
            <CompareRow label="Status" months={months} get={(m) => healthLabel[m.health]} />
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CompareRow({
  label,
  months,
  get,
}: {
  label: string;
  months: AnnualMonth[];
  get: (m: AnnualMonth) => string;
}) {
  return (
    <tr>
      <td className="py-2 pr-2 text-muted-foreground text-xs">{label}</td>
      {months.map((m) => (
        <td key={m.month} className="py-2 px-2 tabular-nums">
          {get(m)}
        </td>
      ))}
    </tr>
  );
}

function MonthDetail({
  month,
  review,
}: {
  month: AnnualMonth;
  review?: { resumo: string; acerto: string; erro: string; recomendacao: string };
}) {
  const navigate = useNavigate();
  const gen = useGenerateMonthlyReview();

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <span className="font-display text-2xl font-semibold">
            {month.label} {month.year}
          </span>
          {!month.is_future && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${healthStyle[month.health]}`}
            >
              {healthLabel[month.health]}
            </span>
          )}
        </SheetTitle>
      </SheetHeader>

      {month.is_future ? (
        <div className="mt-6 p-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          Mês futuro. Sem dados consolidados ainda.
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {/* Execução */}
          <Section title="Execução" icon={<Activity className="h-3.5 w-3.5" />}>
            <Stat label="Taxa" value={`${month.execution.rate}%`} />
            <Stat label="Concluídas" value={`${month.execution.done}/${month.execution.planned}`} />
            <Stat label="Dias produtivos" value={String(month.execution.productive_days)} />
            <Stat label="Dias improdutivos" value={String(month.execution.unproductive_days)} />
          </Section>

          {/* Financeiro */}
          <Section title="Financeiro" icon={<Wallet className="h-3.5 w-3.5" />}>
            <Stat label="Receita" value={formatBRL(month.financial.receita)} accent="success" />
            <Stat label="Despesa" value={formatBRL(month.financial.despesa)} accent="danger" />
            <Stat
              label="Lucro"
              value={formatBRL(month.financial.lucro)}
              accent={month.financial.lucro >= 0 ? "success" : "danger"}
            />
            <Stat label="—" value=" " />
            <Stat label="Pessoal — receita" value={formatBRL(month.financial.receita_pessoal)} small />
            <Stat label="Pessoal — despesa" value={formatBRL(month.financial.despesa_pessoal)} small />
            <Stat
              label="Profissional — receita"
              value={formatBRL(month.financial.receita_profissional)}
              small
            />
            <Stat
              label="Profissional — despesa"
              value={formatBRL(month.financial.despesa_profissional)}
              small
            />
          </Section>

          {/* Metas */}
          <Section title="Metas" icon={<Target className="h-3.5 w-3.5" />}>
            <Stat label="Total" value={String(month.goals.total)} />
            <Stat label="Ativas" value={String(month.goals.ativas)} />
            <Stat label="Concluídas" value={String(month.goals.concluidas)} accent="success" />
            <Stat
              label="Atrasadas"
              value={String(month.goals.atrasadas)}
              accent={month.goals.atrasadas > 0 ? "danger" : undefined}
            />
            <Stat label="Progresso médio" value={`${month.goals.progresso_medio}%`} />
          </Section>

          {/* Alertas */}
          {month.alerts.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Alertas
              </div>
              <div className="space-y-1.5">
                {month.alerts.map((a, i) => (
                  <div
                    key={i}
                    className={`text-xs p-2 rounded-md border ${
                      a.level === "danger"
                        ? "border-destructive/40 bg-destructive/5 text-destructive"
                        : a.level === "warning"
                          ? "border-warning/40 bg-warning/5 text-warning"
                          : "border-primary/40 bg-primary/5 text-primary"
                    }`}
                  >
                    {a.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revisão IA */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Revisão IA
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => gen.mutate(month)}
                disabled={gen.isPending}
              >
                {gen.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" /> {review ? "Reavaliar" : "Gerar revisão"}
                  </>
                )}
              </Button>
            </div>
            {review || gen.data ? (
              <div className="space-y-2">
                <ReviewLine label="Resumo" value={(gen.data ?? review)!.resumo} />
                <ReviewLine label="Acerto" value={(gen.data ?? review)!.acerto} accent="success" />
                <ReviewLine label="Erro" value={(gen.data ?? review)!.erro} accent="danger" />
                <ReviewLine
                  label="Próximo mês"
                  value={(gen.data ?? review)!.recomendacao}
                  accent="primary"
                  icon={<ArrowRight className="h-3 w-3" />}
                />
              </div>
            ) : (
              <div className="text-xs text-muted-foreground p-3 rounded-md border border-dashed border-border">
                Sem revisão gerada para este mês. Clique em "Gerar revisão".
              </div>
            )}
          </div>

          {/* Ações de navegação */}
          <div className="pt-4 border-t border-border space-y-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
              Abrir módulos
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/planner")}>
                Planner
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/planner/revisao")}>
                Revisão semanal
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/metas")}>
                Metas
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/financeiro")}>
                Financeiro
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-2 flex items-center gap-1">
        {icon} {title}
      </div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string;
  accent?: "success" | "danger";
  small?: boolean;
}) {
  if (label === "—") return <div className="col-span-2 border-t border-border my-1" />;
  const cls =
    accent === "success" ? "text-success" : accent === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div className="p-2 rounded-md border border-border bg-card">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`tabular-nums font-semibold ${small ? "text-sm" : "font-display text-lg"} ${cls}`}>
        {value}
      </div>
    </div>
  );
}

function ReviewLine({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent?: "success" | "danger" | "primary";
  icon?: React.ReactNode;
}) {
  const borderCls =
    accent === "success"
      ? "border-success/40 bg-success/5"
      : accent === "danger"
        ? "border-destructive/40 bg-destructive/5"
        : accent === "primary"
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-muted/30";
  return (
    <div className={`p-2.5 rounded-md border ${borderCls}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1 mb-0.5">
        {icon} {label}
      </div>
      <div className="text-sm leading-relaxed">{value}</div>
    </div>
  );
}
