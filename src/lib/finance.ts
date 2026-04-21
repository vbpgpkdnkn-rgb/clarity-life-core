/**
 * Núcleo de cálculos do Life OS — fonte única da verdade.
 * Toda a UI deve consumir essas funções.
 */
import { todayISO, addDaysISO, startOfMonthISO, endOfMonthISO } from "./format";

export type TxnStatus = "pago" | "pendente" | "futuro";

export interface Txn {
  id: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  goal_id: string | null;
  type: "entrada" | "saida" | "transferencia";
  nature: "fixo" | "variavel";
  scope: "pessoal" | "profissional";
  amount: number | string;
  description: string | null;
  date: string;
  status: TxnStatus;
}

export interface Account {
  id: string;
  name: string;
  scope: "pessoal" | "profissional";
  initial_balance: number | string;
}

export interface Recurrence {
  id: string;
  account_id: string;
  category_id: string | null;
  type: "entrada" | "saida" | "transferencia";
  scope: "pessoal" | "profissional";
  amount: number | string;
  description: string;
  frequency: "diaria" | "semanal" | "mensal" | "anual";
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  active: boolean;
}

const num = (v: any) => Number(v ?? 0);

/* ---------------- SALDO ---------------- */

/** Saldo de uma conta considerando apenas transações PAGAS até `until` (default = hoje). */
export function accountBalance(account: Account, txns: Txn[], until: string = todayISO()): number {
  let bal = num(account.initial_balance);
  for (const t of txns) {
    if (t.status !== "pago") continue;
    if (t.date > until) continue;
    if (t.account_id === account.id) {
      if (t.type === "entrada") bal += num(t.amount);
      else if (t.type === "saida") bal -= num(t.amount);
      else if (t.type === "transferencia") bal -= num(t.amount);
    }
    if (t.to_account_id === account.id && t.type === "transferencia") bal += num(t.amount);
  }
  return bal;
}

/** Saldo total agrupado por escopo. */
export function balancesByScope(accounts: Account[], txns: Txn[]) {
  let pessoal = 0;
  let profissional = 0;
  for (const a of accounts) {
    const b = accountBalance(a, txns);
    if (a.scope === "pessoal") pessoal += b;
    else profissional += b;
  }
  return { pessoal, profissional, total: pessoal + profissional };
}

/* ---------------- FLUXO DE CAIXA ---------------- */

/** Retorna receitas/despesas/lucro PAGOS num período. */
export function cashFlow(
  txns: Txn[],
  startDate: string,
  endDate: string,
  scope?: "pessoal" | "profissional",
) {
  let receitas = 0;
  let despesas = 0;
  for (const t of txns) {
    if (t.status !== "pago") continue;
    if (t.date < startDate || t.date > endDate) continue;
    if (scope && t.scope !== scope) continue;
    if (t.type === "entrada") receitas += num(t.amount);
    else if (t.type === "saida") despesas += num(t.amount);
  }
  return { receitas, despesas, lucro: receitas - despesas };
}

/* ---------------- RECORRÊNCIAS ---------------- */

/** Expande uma recorrência em ocorrências entre `from` e `to`. */
export function expandRecurrence(r: Recurrence, from: string, to: string): { date: string; amount: number; type: Recurrence["type"]; scope: Recurrence["scope"] }[] {
  if (!r.active) return [];
  const out: { date: string; amount: number; type: Recurrence["type"]; scope: Recurrence["scope"] }[] = [];
  const start = r.start_date > from ? r.start_date : from;
  const end = r.end_date && r.end_date < to ? r.end_date : to;
  if (start > end) return [];

  const pushIf = (dateISO: string) => {
    if (dateISO >= start && dateISO <= end) {
      out.push({ date: dateISO, amount: num(r.amount), type: r.type, scope: r.scope });
    }
  };

  if (r.frequency === "diaria") {
    let d = start;
    while (d <= end) {
      pushIf(d);
      d = addDaysISO(d, 1);
    }
  } else if (r.frequency === "semanal") {
    // Mantém o dia da semana da start_date
    const startDow = new Date(r.start_date + "T00:00:00").getDay();
    let d = start;
    // Avança até o primeiro dia da semana correspondente
    while (new Date(d + "T00:00:00").getDay() !== startDow && d <= end) {
      d = addDaysISO(d, 1);
    }
    while (d <= end) {
      pushIf(d);
      d = addDaysISO(d, 7);
    }
  } else if (r.frequency === "mensal") {
    const dom = r.day_of_month ?? new Date(r.start_date + "T00:00:00").getDate();
    const startDate = new Date(start + "T00:00:00");
    const endDate = new Date(end + "T00:00:00");
    let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cur <= endDate) {
      const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      const day = Math.min(dom, lastDay);
      const occ = new Date(cur.getFullYear(), cur.getMonth(), day);
      const occISO = occ.toISOString().slice(0, 10);
      pushIf(occISO);
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  } else if (r.frequency === "anual") {
    const startBase = new Date(r.start_date + "T00:00:00");
    const endDate = new Date(end + "T00:00:00");
    let y = Math.max(startBase.getFullYear(), new Date(start + "T00:00:00").getFullYear());
    while (y <= endDate.getFullYear()) {
      const occ = new Date(y, startBase.getMonth(), startBase.getDate());
      pushIf(occ.toISOString().slice(0, 10));
      y++;
    }
  }
  return out;
}

/* ---------------- PROJEÇÃO ---------------- */

/**
 * Projeção: parte do saldo PAGO atual e soma:
 * - transações futuras (status = futuro OU pendente OU pago com data > hoje)
 * - ocorrências de recorrências entre amanhã e `until`
 *
 * Retorna saldo projetado consolidado + série diária.
 */
export function projectBalance(
  accounts: Account[],
  txns: Txn[],
  recurrences: Recurrence[],
  until: string,
  scope?: "pessoal" | "profissional",
): { saldoAtual: number; saldoProjetado: number; receitasFuturas: number; despesasFuturas: number; series: { date: string; saldo: number }[] } {
  const today = todayISO();
  const filterScope = (s: "pessoal" | "profissional") => !scope || s === scope;
  const accs = accounts.filter((a) => filterScope(a.scope));

  // Saldo atual = pago até hoje
  let saldoAtual = 0;
  for (const a of accs) saldoAtual += accountBalance(a, txns, today);

  // Movimentos futuros (entre amanhã e until)
  const tomorrow = addDaysISO(today, 1);
  const events: { date: string; delta: number }[] = [];

  // Transações com data futura ou status pendente/futuro
  for (const t of txns) {
    if (!filterScope(t.scope)) continue;
    const isFuture = t.date > today;
    const isUnsettled = t.status !== "pago";
    if (!isFuture && !isUnsettled) continue;
    if (t.date > until) continue;
    const effectiveDate = t.date < tomorrow ? tomorrow : t.date;
    let delta = 0;
    const isOurAccount = accs.some((a) => a.id === t.account_id);
    const isOurTo = t.to_account_id && accs.some((a) => a.id === t.to_account_id);
    if (t.type === "entrada" && isOurAccount) delta += num(t.amount);
    else if (t.type === "saida" && isOurAccount) delta -= num(t.amount);
    else if (t.type === "transferencia") {
      if (isOurAccount) delta -= num(t.amount);
      if (isOurTo) delta += num(t.amount);
    }
    if (delta !== 0) events.push({ date: effectiveDate, delta });
  }

  // Recorrências
  for (const r of recurrences) {
    if (!r.active || !filterScope(r.scope)) continue;
    if (!accs.some((a) => a.id === r.account_id)) continue;
    const occs = expandRecurrence(r, tomorrow, until);
    for (const o of occs) {
      let delta = 0;
      if (o.type === "entrada") delta += o.amount;
      else if (o.type === "saida") delta -= o.amount;
      if (delta !== 0) events.push({ date: o.date, delta });
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  let receitasFuturas = 0;
  let despesasFuturas = 0;
  events.forEach((e) => {
    if (e.delta > 0) receitasFuturas += e.delta;
    else despesasFuturas += -e.delta;
  });

  // Série diária acumulada
  const series: { date: string; saldo: number }[] = [];
  let running = saldoAtual;
  series.push({ date: today, saldo: running });
  let cursor = tomorrow;
  while (cursor <= until) {
    const todays = events.filter((e) => e.date === cursor);
    for (const e of todays) running += e.delta;
    series.push({ date: cursor, saldo: running });
    cursor = addDaysISO(cursor, 1);
  }

  return {
    saldoAtual,
    saldoProjetado: running,
    receitasFuturas,
    despesasFuturas,
    series,
  };
}

/* ---------------- METAS ---------------- */

export interface Goal {
  id: string;
  name: string;
  scope: "pessoal" | "profissional";
  kind: "tarefas" | "financeiro" | "marcos" | "hibrida";
  target_value: number | string | null;
  target_tasks: number | null;
  weight_financial: number | string | null;
  weight_tasks: number | string | null;
  deadline: string | null;
  status: "ativa" | "concluida" | "pausada";
  created_at: string;
}

export interface Task {
  id: string;
  goal_id: string | null;
  status: "pendente" | "em_andamento" | "concluida";
  due_date: string | null;
  completed_at: string | null;
  scope: "pessoal" | "profissional";
}

export interface Milestone {
  id: string;
  goal_id: string;
  done: boolean;
}

export interface GoalProgress {
  pct: number;
  current: number;
  target: number | null;
  /** Atraso em relação ao prazo: 0 = no ritmo, positivo = adiantado, negativo = atrasado */
  paceDelta: number;
  /** Status temporal: ok | atrasada | concluida | sem_prazo */
  pace: "ok" | "atrasada" | "concluida" | "sem_prazo";
  detail?: string;
}

/** Calcula progresso de uma meta, suportando todos os tipos. */
export function computeGoalProgress(
  goal: Goal,
  tasks: Task[],
  txns: Txn[],
  milestones: Milestone[],
): GoalProgress {
  let pct = 0;
  let current = 0;
  let target: number | null = null;
  let detail = "";

  if (goal.kind === "tarefas") {
    const linked = tasks.filter((t) => t.goal_id === goal.id);
    target = goal.target_tasks || linked.length;
    current = linked.filter((t) => t.status === "concluida").length;
    pct = target > 0 ? Math.round((current / target) * 100) : 0;
    detail = `${current} de ${target} tarefas`;
  } else if (goal.kind === "financeiro") {
    const linkedTxns = txns.filter((t) => t.goal_id === goal.id && t.status === "pago");
    current = linkedTxns.reduce(
      (acc, t) => acc + (t.type === "entrada" ? num(t.amount) : -num(t.amount)),
      0,
    );
    target = num(goal.target_value);
    pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  } else if (goal.kind === "marcos") {
    const linked = milestones.filter((m) => m.goal_id === goal.id);
    target = linked.length;
    current = linked.filter((m) => m.done).length;
    pct = target > 0 ? Math.round((current / target) * 100) : 0;
    detail = `${current} de ${target} marcos`;
  } else if (goal.kind === "hibrida") {
    const linkedTasks = tasks.filter((t) => t.goal_id === goal.id);
    const tasksTarget = goal.target_tasks || linkedTasks.length;
    const tasksDone = linkedTasks.filter((t) => t.status === "concluida").length;
    const tasksPct = tasksTarget > 0 ? (tasksDone / tasksTarget) * 100 : 0;

    const linkedTxns = txns.filter((t) => t.goal_id === goal.id && t.status === "pago");
    const finCurrent = linkedTxns.reduce(
      (acc, t) => acc + (t.type === "entrada" ? num(t.amount) : -num(t.amount)),
      0,
    );
    const finTarget = num(goal.target_value);
    const finPct = finTarget > 0 ? Math.min(100, (finCurrent / finTarget) * 100) : 0;

    const wF = num(goal.weight_financial ?? 50);
    const wT = num(goal.weight_tasks ?? 50);
    const totalW = wF + wT || 1;
    pct = Math.round((finPct * wF + tasksPct * wT) / totalW);
    current = finCurrent;
    target = finTarget;
    detail = `${tasksDone}/${tasksTarget} tarefas · ${Math.round(finPct)}% financeiro`;
  }

  // Pace analysis
  let pace: GoalProgress["pace"] = "sem_prazo";
  let paceDelta = 0;
  if (goal.status === "concluida" || pct >= 100) {
    pace = "concluida";
  } else if (goal.deadline) {
    const start = new Date(goal.created_at).getTime();
    const end = new Date(goal.deadline + "T23:59:59").getTime();
    const now = Date.now();
    if (now > end) {
      pace = "atrasada";
      paceDelta = pct - 100;
    } else {
      const expectedPct = ((now - start) / (end - start)) * 100;
      paceDelta = pct - expectedPct;
      pace = paceDelta < -10 ? "atrasada" : "ok";
    }
  }

  return { pct, current, target, paceDelta, pace, detail };
}

/* ---------------- ALERTAS ---------------- */

export interface Alert {
  id: string;
  level: "warning" | "danger" | "info";
  title: string;
  description: string;
  link: string;
}

export function buildAlerts(args: {
  tasks: Task[];
  goals: (Goal & { progress: GoalProgress })[];
  txns: Txn[];
  accounts: Account[];
  recurrences: Recurrence[];
}): Alert[] {
  const today = todayISO();
  const alerts: Alert[] = [];

  // Tarefas atrasadas
  const overdueTasks = args.tasks.filter(
    (t) => t.status !== "concluida" && t.due_date && t.due_date < today,
  );
  if (overdueTasks.length > 0) {
    alerts.push({
      id: "tasks-overdue",
      level: "warning",
      title: `${overdueTasks.length} ${overdueTasks.length === 1 ? "tarefa atrasada" : "tarefas atrasadas"}`,
      description: "Revise e reagende no Planner",
      link: "/planner",
    });
  }

  // Metas atrasadas
  const overdueGoals = args.goals.filter((g) => g.progress.pace === "atrasada");
  if (overdueGoals.length > 0) {
    alerts.push({
      id: "goals-overdue",
      level: "danger",
      title: `${overdueGoals.length} ${overdueGoals.length === 1 ? "meta abaixo do esperado" : "metas abaixo do esperado"}`,
      description: overdueGoals
        .slice(0, 2)
        .map((g) => g.name)
        .join(", "),
      link: "/metas",
    });
  }

  // Saldo projetado negativo (próximos 30 dias)
  const proj = projectBalance(args.accounts, args.txns, args.recurrences, addDaysISO(today, 30));
  const lowestPoint = proj.series.reduce((min, p) => (p.saldo < min.saldo ? p : min), proj.series[0] ?? { date: today, saldo: 0 });
  if (lowestPoint && lowestPoint.saldo < 0) {
    alerts.push({
      id: "neg-balance",
      level: "danger",
      title: "Saldo projetado negativo",
      description: `Em ${lowestPoint.date}, saldo cai a ${lowestPoint.saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      link: "/financeiro",
    });
  }

  // Despesas do mês acima da média dos últimos 3 meses
  const monthStart = startOfMonthISO();
  const monthEnd = endOfMonthISO();
  const currentMonthSpend = cashFlow(args.txns, monthStart, monthEnd).despesas;
  const past: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const ref = new Date();
    ref.setMonth(ref.getMonth() - i, 1);
    const s = ref.toISOString().slice(0, 10);
    const e = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).toISOString().slice(0, 10);
    past.push(cashFlow(args.txns, s, e).despesas);
  }
  const avgPast = past.reduce((a, b) => a + b, 0) / (past.length || 1);
  if (avgPast > 0 && currentMonthSpend > avgPast * 1.2) {
    const pct = Math.round(((currentMonthSpend - avgPast) / avgPast) * 100);
    alerts.push({
      id: "spend-above-avg",
      level: "warning",
      title: `Despesas ${pct}% acima da média`,
      description: `${currentMonthSpend.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} este mês vs ${avgPast.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} média`,
      link: "/financeiro",
    });
  }

  // Transações pendentes (não conciliadas)
  const pendingTxns = args.txns.filter((t) => t.status === "pendente");
  if (pendingTxns.length > 0) {
    alerts.push({
      id: "pending-txns",
      level: "info",
      title: `${pendingTxns.length} ${pendingTxns.length === 1 ? "transação pendente" : "transações pendentes"}`,
      description: "Confirme se já foram pagas",
      link: "/financeiro",
    });
  }

  return alerts;
}
