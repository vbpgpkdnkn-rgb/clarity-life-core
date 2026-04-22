import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScopeBadge } from "@/components/ScopeBadge";
import { TransactionFormDrawer } from "@/components/forms/TransactionFormDrawer";
import { RecurrenceFormDrawer } from "@/components/forms/RecurrenceFormDrawer";
import { AccountFormDrawer } from "@/components/forms/AccountFormDrawer";
import { ReconciliationPanel } from "@/components/financeiro/ReconciliationPanel";
import {
  useAccounts,
  useTransactions,
  useCategories,
  useRecurrences,
  useUpsertTransaction,
} from "@/hooks/useData";
import {
  formatBRL,
  formatDateBR,
  todayISO,
  startOfMonthISO,
  endOfMonthISO,
  addDaysISO,
} from "@/lib/format";
import {
  balancesByScope,
  cashFlow,
  projectBalance,
  accountBalance,
} from "@/lib/finance";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon,
  Repeat,
  Building2,
  Pencil,
  X,
  Heart,
  Briefcase,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";

import { useScope } from "@/contexts/ScopeContext";

type ScopeFilter = "todos" | "pessoal" | "profissional";
type Period = "mes" | "30d" | "90d" | "ano" | "tudo";

export default function Financeiro() {
  const { scope: scopeFilter } = useScope();
  const [period, setPeriod] = useState<Period>("mes");
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");
  const [natureFilter, setNatureFilter] = useState<"todos" | "fixo" | "variavel">("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | "pago" | "pendente" | "futuro">("todos");

  const [txnOpen, setTxnOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<any>(null);
  const [recOpen, setRecOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<any>(null);
  const [acctOpen, setAcctOpen] = useState(false);
  const [editingAcct, setEditingAcct] = useState<any>(null);

  const { data: accounts = [] } = useAccounts();
  const { data: txns = [] } = useTransactions();
  const { data: categories = [] } = useCategories("transaction");
  const { data: recurrences = [] } = useRecurrences();
  const upsertTxn = useUpsertTransaction();

  const today = todayISO();
  const monthStart = startOfMonthISO();
  const monthEnd = endOfMonthISO();

  // Period range
  const { periodStart, periodEnd } = useMemo(() => {
    if (period === "mes") return { periodStart: monthStart, periodEnd: monthEnd };
    if (period === "30d") return { periodStart: addDaysISO(today, -30), periodEnd: today };
    if (period === "90d") return { periodStart: addDaysISO(today, -90), periodEnd: today };
    if (period === "ano") {
      const y = new Date().getFullYear();
      return { periodStart: `${y}-01-01`, periodEnd: `${y}-12-31` };
    }
    return { periodStart: "1900-01-01", periodEnd: "2999-12-31" };
  }, [period, today, monthStart, monthEnd]);

  // Scope-filtered base sets
  const scopedAccounts = useMemo(
    () => (scopeFilter === "todos" ? accounts : accounts.filter((a) => a.scope === scopeFilter)),
    [accounts, scopeFilter],
  );
  const scopedTxns = useMemo(
    () => (scopeFilter === "todos" ? txns : txns.filter((t) => t.scope === scopeFilter)),
    [txns, scopeFilter],
  );

  // Saldos
  const balances = useMemo(() => balancesByScope(scopedAccounts as any, txns as any), [scopedAccounts, txns]);
  const accountBalances = useMemo(
    () => scopedAccounts.map((a) => ({ ...a, balance: accountBalance(a as any, txns as any) })),
    [scopedAccounts, txns],
  );

  // Fluxo de caixa do período
  const flow = useMemo(() => cashFlow(scopedTxns as any, periodStart, periodEnd), [scopedTxns, periodStart, periodEnd]);
  const taxaEconomia = flow.receitas > 0 ? Math.round((flow.lucro / flow.receitas) * 100) : 0;
  const taxaGasto = flow.receitas > 0 ? Math.round((flow.despesas / flow.receitas) * 100) : 0;

  // Projeção (próximos 30 dias e até fim do mês)
  const proj30 = useMemo(
    () =>
      projectBalance(
        scopedAccounts as any,
        txns as any,
        recurrences as any,
        addDaysISO(today, 30),
        scopeFilter === "todos" ? undefined : scopeFilter,
      ),
    [scopedAccounts, txns, recurrences, today, scopeFilter],
  );

  // Crescimento de receita: mês atual vs anterior
  const growthLabel = useMemo(() => {
    const prevStart = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1, 1);
      return d.toISOString().slice(0, 10);
    })();
    const prevEnd = (() => {
      const d = new Date();
      d.setMonth(d.getMonth(), 0);
      return d.toISOString().slice(0, 10);
    })();
    const prev = cashFlow(scopedTxns as any, prevStart, prevEnd).receitas;
    const cur = cashFlow(scopedTxns as any, monthStart, monthEnd).receitas;
    if (prev === 0) return cur > 0 ? "+100%" : "—";
    const pct = Math.round(((cur - prev) / prev) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}%`;
  }, [scopedTxns, monthStart, monthEnd]);

  // 6 meses chart
  const last6Months = useMemo(() => {
    const out: any[] = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const start = ref.toISOString().slice(0, 10);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).toISOString().slice(0, 10);
      const monthLabel = ref.toLocaleDateString("pt-BR", { month: "short" });
      const f = cashFlow(scopedTxns as any, start, end);
      out.push({ month: monthLabel, receitas: f.receitas, despesas: f.despesas });
    }
    return out;
  }, [scopedTxns]);

  // Despesas por categoria (período + filtros)
  const filteredTxns = useMemo(() => {
    return scopedTxns.filter((t) => {
      if (t.date < periodStart || t.date > periodEnd) return false;
      if (categoryFilter !== "todas" && t.category_id !== categoryFilter) return false;
      if (natureFilter !== "todos" && t.nature !== natureFilter) return false;
      if (statusFilter !== "todos" && t.status !== statusFilter) return false;
      return true;
    });
  }, [scopedTxns, periodStart, periodEnd, categoryFilter, natureFilter, statusFilter]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    filteredTxns
      .filter((t) => t.type === "saida" && t.status === "pago")
      .forEach((t) => {
        const cat = categories.find((c) => c.id === t.category_id)?.name || "Sem categoria";
        map.set(cat, (map.get(cat) || 0) + Number(t.amount));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredTxns, categories]);

  const reconcile = (t: any) => {
    upsertTxn.mutate({ ...t, status: t.status === "pago" ? "pendente" : "pago" });
  };

  // Limpar filtros
  const hasFilters = categoryFilter !== "todas" || natureFilter !== "todos" || statusFilter !== "todos" || period !== "mes";
  const clearFilters = () => {
    setCategoryFilter("todas");
    setNatureFilter("todos");
    setStatusFilter("todos");
    setPeriod("mes");
  };

  const PIE_COLORS = [
    "hsl(28 75% 55%)",
    "hsl(215 35% 35%)",
    "hsl(145 50% 38%)",
    "hsl(38 90% 50%)",
    "hsl(0 65% 50%)",
    "hsl(265 50% 50%)",
  ];

  return (
    <AppLayout
      title="Financeiro"
      subtitle="Controle total das suas finanças"
      action={
        <Button size="sm" onClick={() => { setEditingTxn(null); setTxnOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Transação
        </Button>
      }
    >
      {/* Scope global no header */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="ml-auto flex items-center gap-2">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Este mês</SelectItem>
              <SelectItem value="30d">Últimos 30d</SelectItem>
              <SelectItem value="90d">Últimos 90d</SelectItem>
              <SelectItem value="ano">Este ano</SelectItem>
              <SelectItem value="tudo">Tudo</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <X className="h-3 w-3" /> limpar
            </button>
          )}
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Saldo total" value={formatBRL(balances.total)} icon={<Wallet className="h-4 w-4" />} />
        <KpiCard label="Receitas pagas" value={formatBRL(flow.receitas)} icon={<TrendingUp className="h-4 w-4" />} accent="success" />
        <KpiCard label="Despesas pagas" value={formatBRL(flow.despesas)} icon={<TrendingDown className="h-4 w-4" />} accent="destructive" />
        <KpiCard
          label={flow.lucro >= 0 ? "Lucro" : "Prejuízo"}
          value={formatBRL(Math.abs(flow.lucro))}
          icon={flow.lucro >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          accent={flow.lucro >= 0 ? "success" : "destructive"}
        />
      </div>

      {/* Separação clara PF vs PJ — sempre visível, mesmo quando escopo = todos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Card className="p-4 border-l-4 border-l-pessoal shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Heart className="h-3.5 w-3.5 text-pessoal" /> Pessoa Física
            </div>
            <span className="text-[10px] text-muted-foreground">
              {accounts.filter((a) => a.scope === "pessoal").length} contas
            </span>
          </div>
          <div className="font-display text-2xl font-semibold tabular-nums text-pessoal">
            {formatBRL(balances.pessoal)}
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-profissional shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5 text-profissional" /> Pessoa Jurídica
            </div>
            <span className="text-[10px] text-muted-foreground">
              {accounts.filter((a) => a.scope === "profissional").length} contas
            </span>
          </div>
          <div className="font-display text-2xl font-semibold tabular-nums text-profissional">
            {formatBRL(balances.profissional)}
          </div>
        </Card>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <IndicatorPill label="Taxa de economia" value={`${taxaEconomia}%`} positive={taxaEconomia >= 20} />
        <IndicatorPill label="Taxa de gasto" value={`${taxaGasto}%`} positive={taxaGasto < 80} />
        <IndicatorPill label="Crescimento receita (vs mês ant.)" value={growthLabel} positive={growthLabel.startsWith("+")} />
        <IndicatorPill
          label="Saldo projetado (30d)"
          value={formatBRL(proj30.saldoProjetado)}
          positive={proj30.saldoProjetado >= balances.total}
        />
      </div>

      <Tabs defaultValue="visao" className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="visao">Visão geral</TabsTrigger>
          <TabsTrigger value="projecao">Projeção</TabsTrigger>
          <TabsTrigger value="transacoes">Transações</TabsTrigger>
          <TabsTrigger value="contas">Contas</TabsTrigger>
          <TabsTrigger value="recorrencias">Recorrências</TabsTrigger>
          <TabsTrigger value="conciliacao">Conciliação</TabsTrigger>
        </TabsList>

        {/* Visão geral */}
        <TabsContent value="visao" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5 shadow-soft">
              <h3 className="font-display text-lg font-semibold mb-4">Receitas x Despesas (6 meses)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last6Months}>
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: any) => formatBRL(Number(v))}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5 shadow-soft">
              <h3 className="font-display text-lg font-semibold mb-4">Top categorias (despesas pagas)</h3>
              {byCategory.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                  Sem despesas no período
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90}>
                        {byCategory.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: any) => formatBRL(Number(v))}
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Projeção */}
        <TabsContent value="projecao" className="space-y-6">
          <Card className="p-5 shadow-soft">
            <h3 className="font-display text-lg font-semibold mb-1">Saldo projetado (próximos 30 dias)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Inclui transações futuras, pendentes e ocorrências de recorrências ativas
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <Stat label="Saldo hoje" value={formatBRL(proj30.saldoAtual)} />
              <Stat label="Receitas previstas" value={formatBRL(proj30.receitasFuturas)} accent="success" />
              <Stat label="Despesas previstas" value={formatBRL(proj30.despesasFuturas)} accent="destructive" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={proj30.series}>
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickFormatter={(v) => formatDateBR(v)}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: any) => formatBRL(Number(v))}
                    labelFormatter={(l) => formatDateBR(l)}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="saldo"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Saldo em 30 dias:</span>
              <span className={`font-display text-xl tabular-nums ${proj30.saldoProjetado >= proj30.saldoAtual ? "text-success" : "text-destructive"}`}>
                {formatBRL(proj30.saldoProjetado)}
              </span>
            </div>
          </Card>
        </TabsContent>

        {/* Transações */}
        <TabsContent value="transacoes">
          {/* Sub-filtros */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={natureFilter} onValueChange={(v: any) => setNatureFilter(v)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Fixo + Variável</SelectItem>
                <SelectItem value="fixo">Só fixo</SelectItem>
                <SelectItem value="variavel">Só variável</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="futuro">Futuro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="shadow-soft overflow-hidden">
            {filteredTxns.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Nenhuma transação no filtro atual.{" "}
                <button onClick={() => { setEditingTxn(null); setTxnOpen(true); }} className="text-accent hover:underline">
                  Criar primeira
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredTxns.slice(0, 200).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setEditingTxn(t); setTxnOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                        t.type === "entrada"
                          ? "bg-success/15 text-success"
                          : t.type === "saida"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {t.type === "entrada" ? <TrendingUp className="h-4 w-4" /> : t.type === "saida" ? <TrendingDown className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t.description || "Sem descrição"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        {formatDateBR(t.date)}
                        <span>·</span>
                        {accounts.find((a) => a.id === t.account_id)?.name}
                        {t.category_id && <>· {categories.find((c) => c.id === t.category_id)?.name}</>}
                        <span className="capitalize">· {t.nature}</span>
                      </div>
                    </div>
                    <ScopeBadge scope={t.scope} />
                    <StatusPill status={t.status} />
                    <span
                      className={`font-display tabular-nums text-sm font-semibold ${
                        t.type === "entrada" ? "text-success" : t.type === "saida" ? "text-destructive" : ""
                      }`}
                    >
                      {t.type === "entrada" ? "+" : t.type === "saida" ? "-" : ""}
                      {formatBRL(Number(t.amount))}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Contas */}
        <TabsContent value="contas">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">
              Saldo consolidado: <span className="font-semibold text-foreground">{formatBRL(balances.total)}</span>{" "}
              <span className="text-xs">(apenas pagos)</span>
            </p>
            <Button size="sm" variant="outline" onClick={() => { setEditingAcct(null); setAcctOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Conta
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accountBalances.map((a) => (
              <button
                key={a.id}
                onClick={() => { setEditingAcct(a); setAcctOpen(true); }}
                className={`text-left p-5 rounded-lg border bg-card hover:shadow-elevated transition-all ${
                  a.scope === "pessoal" ? "gradient-warm" : "gradient-cool"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <ScopeBadge scope={a.scope} />
                  </div>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-1">{a.name}</h3>
                <div className="font-display text-2xl font-semibold tabular-nums">{formatBRL(a.balance)}</div>
                {Number(a.initial_balance) !== 0 && (
                  <div className="text-xs text-muted-foreground mt-1">Inicial: {formatBRL(Number(a.initial_balance))}</div>
                )}
              </button>
            ))}
          </div>
        </TabsContent>

        {/* Recorrências */}
        <TabsContent value="recorrencias">
          <div className="flex justify-end mb-3">
            <Button size="sm" variant="outline" onClick={() => { setEditingRec(null); setRecOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Recorrência
            </Button>
          </div>
          {recurrences.length === 0 ? (
            <Card className="p-12 text-center shadow-soft">
              <Repeat className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-display text-xl mb-2">Sem recorrências</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Cadastre salário, aluguel, assinaturas e elas entram automaticamente na sua projeção.
              </p>
              <Button onClick={() => setRecOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Criar recorrência
              </Button>
            </Card>
          ) : (
            <Card className="divide-y divide-border shadow-soft overflow-hidden">
              {recurrences
                .filter((r) => scopeFilter === "todos" || r.scope === scopeFilter)
                .map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setEditingRec(r); setRecOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <Repeat className={`h-4 w-4 ${r.type === "entrada" ? "text-success" : "text-destructive"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{r.description}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {r.frequency}
                        {r.day_of_month ? ` · dia ${r.day_of_month}` : ""}
                        {!r.active && " · inativa"}
                      </div>
                    </div>
                    <ScopeBadge scope={r.scope} />
                    <span
                      className={`font-display tabular-nums text-sm font-semibold ${
                        r.type === "entrada" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {r.type === "entrada" ? "+" : "-"}
                      {formatBRL(Number(r.amount))}
                    </span>
                  </button>
                ))}
            </Card>
          )}
        </TabsContent>

        {/* Conciliação */}
        <TabsContent value="conciliacao">
          <ReconciliationPanel />
        </TabsContent>
      </Tabs>

      <TransactionFormDrawer open={txnOpen} onOpenChange={setTxnOpen} txn={editingTxn} />
      <RecurrenceFormDrawer open={recOpen} onOpenChange={setRecOpen} rec={editingRec} />
      <AccountFormDrawer open={acctOpen} onOpenChange={setAcctOpen} account={editingAcct} />
    </AppLayout>
  );
}

function KpiCard({
  label,
  value,
  icon,
  accent,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: "success" | "destructive";
  sub?: string;
}) {
  const color = accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <Card className="p-4 shadow-soft gradient-card">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-2">
        <span className={color}>{icon}</span> {label}
      </div>
      <div className={`font-display text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1 truncate">{sub}</div>}
    </Card>
  );
}

function IndicatorPill({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <Card className={`p-3 shadow-soft border ${positive ? "border-success/30" : "border-warning/30"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 truncate">{label}</div>
      <div className={`font-display text-base font-semibold tabular-nums ${positive ? "text-success" : "text-warning"}`}>
        {value}
      </div>
    </Card>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "success" | "destructive" }) {
  const color = accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : "";
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`font-display text-xl tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: "pago" | "pendente" | "futuro" }) {
  const cfg = {
    pago: { icon: CheckCircle2, cls: "text-success bg-success/10", label: "Pago" },
    pendente: { icon: Clock, cls: "text-warning bg-warning/10", label: "Pendente" },
    futuro: { icon: CalendarIcon, cls: "text-muted-foreground bg-muted", label: "Futuro" },
  }[status];
  const Icon = cfg.icon;
  return (
    <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.cls}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}
