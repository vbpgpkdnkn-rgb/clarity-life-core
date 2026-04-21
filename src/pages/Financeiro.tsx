import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScopeBadge } from "@/components/ScopeBadge";
import { TransactionFormDrawer } from "@/components/forms/TransactionFormDrawer";
import { RecurrenceFormDrawer } from "@/components/forms/RecurrenceFormDrawer";
import { AccountFormDrawer } from "@/components/forms/AccountFormDrawer";
import { CSVImport } from "@/components/financeiro/CSVImport";
import {
  useAccountBalances,
  useTransactions,
  useCategories,
  useRecurrences,
  useUpsertTransaction,
} from "@/hooks/useData";
import { formatBRL, formatDateBR, todayISO, startOfMonthISO, endOfMonthISO, addDaysISO } from "@/lib/format";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  CheckCircle2,
  Clock,
  Repeat,
  Building2,
  Pencil,
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
} from "recharts";

type ScopeFilter = "todos" | "pessoal" | "profissional";

export default function Financeiro() {
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("todos");
  const [txnOpen, setTxnOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<any>(null);
  const [recOpen, setRecOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<any>(null);
  const [acctOpen, setAcctOpen] = useState(false);
  const [editingAcct, setEditingAcct] = useState<any>(null);

  const accounts = useAccountBalances();
  const { data: txns = [] } = useTransactions();
  const { data: categories = [] } = useCategories("transaction");
  const { data: recurrences = [] } = useRecurrences();
  const upsertTxn = useUpsertTransaction();

  const today = todayISO();
  const monthStart = startOfMonthISO();
  const monthEnd = endOfMonthISO();

  const filteredAccounts = scopeFilter === "todos" ? accounts : accounts.filter((a) => a.scope === scopeFilter);
  const filteredTxns = scopeFilter === "todos" ? txns : txns.filter((t) => t.scope === scopeFilter);

  const monthTxns = filteredTxns.filter((t) => t.date >= monthStart && t.date <= monthEnd);
  const receitas = monthTxns.filter((t) => t.type === "entrada").reduce((s, t) => s + Number(t.amount), 0);
  const despesas = monthTxns.filter((t) => t.type === "saida").reduce((s, t) => s + Number(t.amount), 0);
  const saldoTotal = filteredAccounts.reduce((s, a) => s + a.balance, 0);
  const lucro = receitas - despesas;
  const taxaEconomia = receitas > 0 ? Math.round((lucro / receitas) * 100) : 0;
  const taxaGasto = receitas > 0 ? Math.round((despesas / receitas) * 100) : 0;

  // Last 6 months chart
  const last6Months = useMemo(() => {
    const out: any[] = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const start = ref.toISOString().slice(0, 10);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).toISOString().slice(0, 10);
      const monthLabel = ref.toLocaleDateString("pt-BR", { month: "short" });
      const inMonth = filteredTxns.filter((t) => t.date >= start && t.date <= end);
      out.push({
        month: monthLabel,
        receitas: inMonth.filter((t) => t.type === "entrada").reduce((s, t) => s + Number(t.amount), 0),
        despesas: inMonth.filter((t) => t.type === "saida").reduce((s, t) => s + Number(t.amount), 0),
      });
    }
    return out;
  }, [filteredTxns]);

  // Categories pie
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    monthTxns
      .filter((t) => t.type === "saida")
      .forEach((t) => {
        const cat = categories.find((c) => c.id === t.category_id)?.name || "Sem categoria";
        map.set(cat, (map.get(cat) || 0) + Number(t.amount));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [monthTxns, categories]);

  // Projeção: saldo + recorrências futuras (próximos 30d)
  const projecao = useMemo(() => {
    let projReceitas = receitas;
    let projDespesas = despesas;
    const remainingDays = Math.ceil((new Date(monthEnd + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const todayDay = new Date().getDate();

    recurrences
      .filter((r) => r.active && (scopeFilter === "todos" || r.scope === scopeFilter))
      .forEach((r) => {
        let occurrences = 0;
        if (r.frequency === "mensal") {
          if (r.day_of_month && r.day_of_month >= todayDay) occurrences = 1;
        } else if (r.frequency === "semanal") {
          occurrences = Math.floor(remainingDays / 7);
        } else if (r.frequency === "diaria") {
          occurrences = remainingDays;
        }
        const total = Number(r.amount) * occurrences;
        if (r.type === "entrada") projReceitas += total;
        else if (r.type === "saida") projDespesas += total;
      });

    return { receitas: projReceitas, despesas: projDespesas, saldo: saldoTotal + (projReceitas - receitas) - (projDespesas - despesas) };
  }, [recurrences, receitas, despesas, saldoTotal, monthEnd, scopeFilter]);

  const reconcile = (t: any) => {
    upsertTxn.mutate({ ...t, status: t.status === "conciliado" ? "pendente" : "conciliado" });
  };

  const PIE_COLORS = ["hsl(28 75% 55%)", "hsl(215 35% 35%)", "hsl(145 50% 38%)", "hsl(38 90% 50%)", "hsl(0 65% 50%)", "hsl(265 50% 50%)"];

  return (
    <AppLayout
      title="Financeiro"
      subtitle="Controle total das suas finanças"
      action={
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setEditingTxn(null); setTxnOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Transação
          </Button>
        </div>
      }
    >
      {/* Scope filter */}
      <div className="flex gap-2 mb-6">
        {(["todos", "pessoal", "profissional"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setScopeFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              scopeFilter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/70 text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Saldo total" value={formatBRL(saldoTotal)} icon={<Wallet className="h-4 w-4" />} />
        <KpiCard label="Receitas no mês" value={formatBRL(receitas)} icon={<TrendingUp className="h-4 w-4" />} accent="success" />
        <KpiCard label="Despesas no mês" value={formatBRL(despesas)} icon={<TrendingDown className="h-4 w-4" />} accent="destructive" />
        <KpiCard
          label={lucro >= 0 ? "Lucro" : "Prejuízo"}
          value={formatBRL(Math.abs(lucro))}
          icon={lucro >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          accent={lucro >= 0 ? "success" : "destructive"}
        />
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <IndicatorPill label="Taxa de economia" value={`${taxaEconomia}%`} positive={taxaEconomia >= 0} />
        <IndicatorPill label="Taxa de gasto" value={`${taxaGasto}%`} positive={taxaGasto < 80} />
        <IndicatorPill label="Saldo projetado (fim do mês)" value={formatBRL(projecao.saldo)} positive={projecao.saldo >= saldoTotal} />
      </div>

      <Tabs defaultValue="visao" className="space-y-6">
        <TabsList>
          <TabsTrigger value="visao">Visão geral</TabsTrigger>
          <TabsTrigger value="transacoes">Transações</TabsTrigger>
          <TabsTrigger value="contas">Contas</TabsTrigger>
          <TabsTrigger value="recorrencias">Recorrências</TabsTrigger>
          <TabsTrigger value="conciliacao">Conciliação</TabsTrigger>
        </TabsList>

        {/* Visão geral: charts */}
        <TabsContent value="visao" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5 shadow-soft">
              <h3 className="font-display text-lg font-semibold mb-4">Receitas x Despesas (6 meses)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last6Months}>
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
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
              <h3 className="font-display text-lg font-semibold mb-4">Top categorias (mês)</h3>
              {byCategory.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Sem despesas no mês</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90}>
                        {byCategory.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatBRL(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <Card className="p-5 shadow-soft">
            <h3 className="font-display text-lg font-semibold mb-4">Previsto x Realizado (mês)</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Receitas previstas</div>
                <div className="font-display text-xl tabular-nums text-success">{formatBRL(projecao.receitas)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Realizado: {formatBRL(receitas)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Despesas previstas</div>
                <div className="font-display text-xl tabular-nums text-destructive">{formatBRL(projecao.despesas)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Realizado: {formatBRL(despesas)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Saldo projetado</div>
                <div className="font-display text-xl tabular-nums">{formatBRL(projecao.saldo)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Hoje: {formatBRL(saldoTotal)}</div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Transações */}
        <TabsContent value="transacoes">
          <Card className="shadow-soft overflow-hidden">
            {filteredTxns.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Nenhuma transação ainda. <button onClick={() => { setEditingTxn(null); setTxnOpen(true); }} className="text-accent hover:underline">Criar primeira</button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredTxns.slice(0, 100).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setEditingTxn(t); setTxnOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                      t.type === "entrada" ? "bg-success/15 text-success" :
                      t.type === "saida" ? "bg-destructive/15 text-destructive" :
                      "bg-primary/15 text-primary"
                    }`}>
                      {t.type === "entrada" ? <TrendingUp className="h-4 w-4" /> : t.type === "saida" ? <TrendingDown className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t.description || "Sem descrição"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {formatDateBR(t.date)}
                        <span>·</span>
                        {accounts.find((a) => a.id === t.account_id)?.name}
                        {t.category_id && <>· {categories.find((c) => c.id === t.category_id)?.name}</>}
                      </div>
                    </div>
                    <ScopeBadge scope={t.scope} />
                    {t.status === "pendente" && <Clock className="h-3.5 w-3.5 text-warning" />}
                    <span className={`font-display tabular-nums text-sm font-semibold ${
                      t.type === "entrada" ? "text-success" : t.type === "saida" ? "text-destructive" : ""
                    }`}>
                      {t.type === "entrada" ? "+" : t.type === "saida" ? "-" : ""}{formatBRL(Number(t.amount))}
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
            <p className="text-sm text-muted-foreground">Saldo consolidado: <span className="font-semibold text-foreground">{formatBRL(saldoTotal)}</span></p>
            <Button size="sm" variant="outline" onClick={() => { setEditingAcct(null); setAcctOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Conta
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAccounts.map((a) => (
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
              <p className="text-sm text-muted-foreground mb-4">Cadastre salário, aluguel, assinaturas e elas entram na sua projeção mensal.</p>
              <Button onClick={() => setRecOpen(true)}><Plus className="h-4 w-4 mr-1" /> Criar recorrência</Button>
            </Card>
          ) : (
            <Card className="divide-y divide-border shadow-soft overflow-hidden">
              {recurrences.filter((r) => scopeFilter === "todos" || r.scope === scopeFilter).map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setEditingRec(r); setRecOpen(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                >
                  <Repeat className={`h-4 w-4 ${r.type === "entrada" ? "text-success" : "text-destructive"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{r.description}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {r.frequency}{r.day_of_month ? ` · dia ${r.day_of_month}` : ""}
                    </div>
                  </div>
                  <ScopeBadge scope={r.scope} />
                  <span className={`font-display tabular-nums text-sm font-semibold ${r.type === "entrada" ? "text-success" : "text-destructive"}`}>
                    {r.type === "entrada" ? "+" : "-"}{formatBRL(Number(r.amount))}
                  </span>
                </button>
              ))}
            </Card>
          )}
        </TabsContent>

        {/* Conciliação */}
        <TabsContent value="conciliacao">
          <Card className="p-5 shadow-soft mb-4">
            <h3 className="font-display text-lg font-semibold mb-2">Importar extrato</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Importe um CSV com colunas <span className="font-mono text-xs">Data, Descrição, Valor</span>. Lançamentos importados ficam pendentes para você revisar.
            </p>
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => (
                <CSVImport key={a.id} accountId={a.id} scope={a.scope} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Conta de destino: a primeira na lista. Para outras contas, alterne em "Contas" e edite o lançamento.</p>
          </Card>

          <h3 className="font-display text-lg font-semibold mb-3">Pendentes ({filteredTxns.filter((t) => t.status === "pendente").length})</h3>
          <Card className="divide-y divide-border shadow-soft overflow-hidden">
            {filteredTxns.filter((t) => t.status === "pendente").length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-success" /> Nenhuma pendente
              </div>
            ) : (
              filteredTxns
                .filter((t) => t.status === "pendente")
                .map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t.description || "—"}</div>
                      <div className="text-xs text-muted-foreground">{formatDateBR(t.date)} · {accounts.find((a) => a.id === t.account_id)?.name}</div>
                    </div>
                    <span className={`font-display tabular-nums text-sm ${t.type === "entrada" ? "text-success" : "text-destructive"}`}>
                      {t.type === "entrada" ? "+" : "-"}{formatBRL(Number(t.amount))}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => reconcile(t)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Conciliar
                    </Button>
                  </div>
                ))
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <TransactionFormDrawer open={txnOpen} onOpenChange={setTxnOpen} txn={editingTxn} />
      <RecurrenceFormDrawer open={recOpen} onOpenChange={setRecOpen} rec={editingRec} />
      <AccountFormDrawer open={acctOpen} onOpenChange={setAcctOpen} account={editingAcct} />
    </AppLayout>
  );
}

function KpiCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: "success" | "destructive" }) {
  const color = accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <Card className="p-4 shadow-soft gradient-card">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-2">
        <span className={color}>{icon}</span> {label}
      </div>
      <div className={`font-display text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
    </Card>
  );
}

function IndicatorPill({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <Card className={`p-3 shadow-soft border ${positive ? "border-success/30" : "border-warning/30"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className={`font-display text-base font-semibold tabular-nums ${positive ? "text-success" : "text-warning"}`}>{value}</div>
    </Card>
  );
}
