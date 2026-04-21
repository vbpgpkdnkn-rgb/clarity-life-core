import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, useTransactions, useGoals } from "./useData";
import { useScope, filterByScope } from "@/contexts/ScopeContext";

const num = (v: any) => Number(v ?? 0);

export interface MonthExecution {
  planned: number;
  done: number;
  rate: number; // 0..100
  productive_days: number;
  unproductive_days: number;
  active_days: number; // dias com pelo menos 1 tarefa
}

export interface MonthFinancial {
  receita: number;
  despesa: number;
  lucro: number;
  receita_pessoal: number;
  despesa_pessoal: number;
  receita_profissional: number;
  despesa_profissional: number;
}

export interface MonthGoals {
  ativas: number;
  concluidas: number;
  atrasadas: number; // status='ativa' & deadline < último dia do mês
  progresso_medio: number; // 0..100
  total: number;
}

export type MonthHealth = "sem_dados" | "bom" | "medio" | "critico";

export interface MonthAlert {
  level: "warning" | "danger" | "info";
  title: string;
}

export interface AnnualMonth {
  year: number;
  month: number; // 1..12
  label: string;
  start: string; // YYYY-MM-DD
  end: string;
  is_future: boolean;
  is_current: boolean;
  execution: MonthExecution;
  financial: MonthFinancial;
  goals: MonthGoals;
  alerts: MonthAlert[];
  health: MonthHealth;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const end = new Date(year, month, 0).toISOString().slice(0, 10);
  return { start, end };
}

function classifyHealth(exec: MonthExecution, fin: MonthFinancial, goals: MonthGoals): MonthHealth {
  if (exec.active_days === 0 && fin.receita === 0 && fin.despesa === 0 && goals.total === 0)
    return "sem_dados";
  let score = 0;
  // Execução
  if (exec.rate >= 70) score += 2;
  else if (exec.rate >= 50) score += 1;
  else if (exec.active_days > 0) score -= 1;
  // Financeiro
  if (fin.receita + fin.despesa > 0) {
    if (fin.lucro > 0) score += 1;
    else if (fin.lucro < 0) score -= 1;
  }
  // Metas
  if (goals.atrasadas > 0) score -= 1;
  if (goals.progresso_medio >= 70) score += 1;

  if (score >= 2) return "bom";
  if (score <= -1) return "critico";
  return "medio";
}

export function useAnnualData(year: number) {
  const { scope } = useScope();
  const { data: tasksAll = [], isLoading: lt } = useTasks();
  const { data: txnsAll = [], isLoading: lx } = useTransactions();
  const { data: goalsAll = [], isLoading: lg } = useGoals();

  const data = useMemo<AnnualMonth[]>(() => {
    const tasks = filterByScope(tasksAll as any[], scope);
    const txns = filterByScope(txnsAll as any[], scope);
    const goals = filterByScope(goalsAll as any[], scope);
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const { start, end } = monthRange(year, month);
      const is_future = start > today;
      const is_current = year === currentYear && month === currentMonth;

      // ----- Execução -----
      const tasksOfMonth = tasks.filter(
        (t: any) => t.due_date && t.due_date >= start && t.due_date <= end,
      );
      const dayBuckets = new Map<string, { p: number; d: number }>();
      for (const t of tasksOfMonth) {
        const b = dayBuckets.get(t.due_date) ?? { p: 0, d: 0 };
        b.p += 1;
        if (t.status === "concluida") b.d += 1;
        dayBuckets.set(t.due_date, b);
      }
      const planned = tasksOfMonth.length;
      const done = tasksOfMonth.filter((t: any) => t.status === "concluida").length;
      const rate = planned === 0 ? 0 : Math.round((done / planned) * 100);
      let productive_days = 0;
      let unproductive_days = 0;
      for (const b of dayBuckets.values()) {
        if (b.p > 0) {
          if (b.d / b.p >= 0.6) productive_days += 1;
          else unproductive_days += 1;
        }
      }
      const execution: MonthExecution = {
        planned,
        done,
        rate,
        productive_days,
        unproductive_days,
        active_days: dayBuckets.size,
      };

      // ----- Financeiro -----
      let receita = 0;
      let despesa = 0;
      let receita_pessoal = 0;
      let despesa_pessoal = 0;
      let receita_profissional = 0;
      let despesa_profissional = 0;
      for (const t of txns as any[]) {
        if (t.status !== "pago") continue;
        if (t.date < start || t.date > end) continue;
        const a = num(t.amount);
        if (t.type === "entrada") {
          receita += a;
          if (t.scope === "pessoal") receita_pessoal += a;
          else if (t.scope === "profissional") receita_profissional += a;
        } else if (t.type === "saida") {
          despesa += a;
          if (t.scope === "pessoal") despesa_pessoal += a;
          else if (t.scope === "profissional") despesa_profissional += a;
        }
      }
      const financial: MonthFinancial = {
        receita,
        despesa,
        lucro: receita - despesa,
        receita_pessoal,
        despesa_pessoal,
        receita_profissional,
        despesa_profissional,
      };

      // ----- Metas -----
      // Considera meta "do mês" se foi criada antes/no fim do mês e não foi concluída antes do início.
      const goalsOfMonth = goals.filter((g: any) => {
        const created = (g.created_at ?? "").slice(0, 10);
        return created <= end;
      });
      const concluidas = goalsOfMonth.filter((g: any) => {
        if (g.status !== "concluida") return false;
        // Aproximação: consideramos concluída no mês se deadline cai no mês ou se created_at no mês.
        const dl = (g.deadline ?? "").slice(0, 10);
        const cr = (g.created_at ?? "").slice(0, 10);
        return (dl >= start && dl <= end) || (cr >= start && cr <= end);
      }).length;
      const ativas = goalsOfMonth.filter((g: any) => g.status === "ativa").length;
      const atrasadas = goalsOfMonth.filter(
        (g: any) =>
          g.status === "ativa" && g.deadline && g.deadline >= start && g.deadline <= end && g.deadline < today,
      ).length;
      // progresso médio: usa current_value / target_value quando aplicável; senão 0
      const progressVals = goalsOfMonth.map((g: any) => {
        const tv = num(g.target_value);
        const cv = num(g.current_value);
        if (tv > 0) return Math.min(100, Math.round((cv / tv) * 100));
        if (g.status === "concluida") return 100;
        return 0;
      });
      const progresso_medio =
        progressVals.length === 0
          ? 0
          : Math.round(progressVals.reduce((a, b) => a + b, 0) / progressVals.length);
      const goalsAgg: MonthGoals = {
        ativas,
        concluidas,
        atrasadas,
        progresso_medio,
        total: goalsOfMonth.length,
      };

      // ----- Alertas -----
      const alerts: MonthAlert[] = [];
      if (!is_future) {
        if (planned > 0 && rate < 50)
          alerts.push({ level: "danger", title: `Execução ${rate}%` });
        if (atrasadas > 0)
          alerts.push({
            level: "danger",
            title: `${atrasadas} ${atrasadas === 1 ? "meta atrasada" : "metas atrasadas"}`,
          });
        if (despesa > 0 && financial.lucro < 0)
          alerts.push({ level: "warning", title: "Prejuízo no mês" });
        if (planned > 0 && unproductive_days > productive_days)
          alerts.push({ level: "warning", title: "Mais dias improdutivos" });
      }

      const health = is_future ? "sem_dados" : classifyHealth(execution, financial, goalsAgg);

      return {
        year,
        month,
        label: MONTH_NAMES[i],
        start,
        end,
        is_future,
        is_current,
        execution,
        financial,
        goals: goalsAgg,
        alerts,
        health,
      };
    });
  }, [tasksAll, txnsAll, goalsAll, scope, year]);

  return { data, isLoading: lt || lx || lg };
}

/** Soma anual acumulada para o cabeçalho. */
export function useAnnualTotals(months: AnnualMonth[]) {
  return useMemo(() => {
    const past = months.filter((m) => !m.is_future);
    const planned = past.reduce((s, m) => s + m.execution.planned, 0);
    const done = past.reduce((s, m) => s + m.execution.done, 0);
    const receita = past.reduce((s, m) => s + m.financial.receita, 0);
    const despesa = past.reduce((s, m) => s + m.financial.despesa, 0);
    const productiveDays = past.reduce((s, m) => s + m.execution.productive_days, 0);
    const unproductiveDays = past.reduce((s, m) => s + m.execution.unproductive_days, 0);
    return {
      planned,
      done,
      execution_rate: planned === 0 ? 0 : Math.round((done / planned) * 100),
      receita,
      despesa,
      lucro: receita - despesa,
      productive_days: productiveDays,
      unproductive_days: unproductiveDays,
      consistency:
        productiveDays + unproductiveDays === 0
          ? 0
          : Math.round((productiveDays / (productiveDays + unproductiveDays)) * 100),
    };
  }, [months]);
}

/* ---------- Revisão IA mensal ---------- */

export interface MonthlyReview {
  resumo: string;
  acerto: string;
  erro: string;
  recomendacao: string;
  generated_at: string;
}

const REVIEW_KIND = "monthly_review";

function reviewKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function useMonthlyReviews(year: number) {
  const { scope } = useScope();
  return useQuery({
    queryKey: ["monthly-reviews", scope, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_insights")
        .select("payload, created_at")
        .eq("scope", scope)
        .eq("kind", REVIEW_KIND)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const map = new Map<string, MonthlyReview>();
      for (const row of data ?? []) {
        const p = (row.payload ?? {}) as any;
        if (p.year === year && p.month && !map.has(reviewKey(p.year, p.month))) {
          map.set(reviewKey(p.year, p.month), {
            resumo: p.resumo ?? "",
            acerto: p.acerto ?? "",
            erro: p.erro ?? "",
            recomendacao: p.recomendacao ?? "",
            generated_at: row.created_at,
          });
        }
      }
      return map;
    },
  });
}

export function useGenerateMonthlyReview() {
  const { scope } = useScope();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (month: AnnualMonth) => {
      const { data, error } = await supabase.functions.invoke("annual-monthly-review", {
        body: {
          scope,
          year: month.year,
          month: month.month,
          label: month.label,
          execution: month.execution,
          financial: month.financial,
          goals: month.goals,
          alerts: month.alerts,
        },
      });
      if (error) throw error;
      return data as MonthlyReview;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly-reviews"] });
    },
  });
}

export const healthLabel: Record<MonthHealth, string> = {
  bom: "Bom",
  medio: "Médio",
  critico: "Crítico",
  sem_dados: "Sem dados",
};

export const healthStyle: Record<MonthHealth, string> = {
  bom: "text-success border-success/40 bg-success/5",
  medio: "text-warning border-warning/40 bg-warning/5",
  critico: "text-destructive border-destructive/40 bg-destructive/5",
  sem_dados: "text-muted-foreground border-border bg-muted/20",
};
