import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatBRL, formatDateBR, todayISO, addDaysISO } from "@/lib/format";
import { toast } from "sonner";
import {
  FileDown,
  FileSpreadsheet,
  FileUp,
  CheckCircle2,
  Link2,
  Link2Off,
  AlertCircle,
  Loader2,
  EyeOff,
} from "lucide-react";

type Period = "7d" | "30d" | "mes" | "personalizado";

// ---------- helpers de exportação ----------

function buildSystemRows(txns: any[], accounts: any[], categories: any[]) {
  return txns.map((t) => ({
    Data: t.date,
    Conta: accounts.find((a) => a.id === t.account_id)?.name ?? "",
    Escopo: t.scope,
    Tipo: t.type,
    Descrição: t.description ?? "",
    Categoria: categories.find((c) => c.id === t.category_id)?.name ?? "",
    Valor: t.type === "saida" ? -Number(t.amount) : Number(t.amount),
    Status: t.status,
    Conciliada: t.reconciled ? "sim" : "não",
    "Ref. banco": t.bank_ref ?? "",
    ID: t.id,
  }));
}

function downloadCSV(rows: any[], filename: string) {
  if (rows.length === 0) {
    toast.error("Sem transações no período.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(";")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadXLSX(systemRows: any[], filename: string) {
  if (systemRows.length === 0) {
    toast.error("Sem transações no período.");
    return;
  }
  const wb = XLSX.utils.book_new();

  // Aba 1: Sistema
  const wsSystem = XLSX.utils.json_to_sheet(systemRows);
  XLSX.utils.book_append_sheet(wb, wsSystem, "Sistema");

  // Aba 2: Banco (vazia, pra colar o extrato)
  const wsBank = XLSX.utils.aoa_to_sheet([
    ["Data", "Descrição", "Valor", "Match (cole abaixo)"],
    ["(cole as linhas do seu extrato bancário aqui)"],
  ]);
  XLSX.utils.book_append_sheet(wb, wsBank, "Banco");

  // Aba 3: Conciliação (fórmulas)
  const aoa: any[][] = [
    [
      "Data sistema",
      "Descrição sistema",
      "Valor sistema",
      "Conta",
      "Status sistema",
      "Match no banco?",
      "Diferença",
    ],
  ];
  systemRows.forEach((r, i) => {
    const row = i + 2; // sheets 1-indexed; +1 header
    aoa.push([
      r.Data,
      r.Descrição,
      r.Valor,
      r.Conta,
      r.Status,
      // Conta quantas vezes esse valor aparece na aba Banco coluna C
      { f: `IFERROR(IF(COUNTIF(Banco!C:C,Sistema!G${row})>0,"✓ encontrado","✗ não encontrado"),"")` },
      // diferença vs banco se data e valor casarem
      { f: `IFERROR(SUMPRODUCT((Banco!A:A=Sistema!A${row})*(Banco!C:C=Sistema!G${row})*Banco!C:C)-Sistema!G${row},"")` },
    ]);
  });
  const wsRec = XLSX.utils.aoa_to_sheet(aoa);
  // largura mínima
  wsRec["!cols"] = [{ wch: 12 }, { wch: 40 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsRec, "Conciliação");

  XLSX.writeFile(wb, filename);
}

// ---------- parser de extrato CSV ----------

function parseCSVStatement(text: string): { date: string; description: string; amount: number; type: "entrada" | "saida"; raw: any }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const sep = (lines[0].match(/;/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? ";" : ",";

  const splitLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQ = !inQ;
      else if (ch === sep && !inQ) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim().replace(/^"|"$/g, ""));
  };

  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  const findIdx = (...keys: string[]) => header.findIndex((h) => keys.some((k) => h.includes(k)));
  const dateIdx = findIdx("data", "date");
  const descIdx = findIdx("desc", "histórico", "historico", "memo");
  const amountIdx = findIdx("valor", "amount", "montante");
  const typeIdx = findIdx("tipo", "type", "d/c");

  if (dateIdx === -1 || amountIdx === -1) return [];

  const out: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = splitLine(lines[i]);
    let dateStr = parts[dateIdx];
    if (!dateStr) continue;
    // dd/mm/yyyy → yyyy-mm-dd
    const dmy = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmy) dateStr = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    // accept yyyy-mm-dd as is

    const rawAmount = (parts[amountIdx] || "")
      .replace(/[^\d,.\-]/g, "")
      .replace(/\.(?=\d{3}([,.]|$))/g, "") // remove thousand separator
      .replace(",", ".");
    const amount = parseFloat(rawAmount);
    if (isNaN(amount) || amount === 0) continue;

    let type: "entrada" | "saida" = amount >= 0 ? "entrada" : "saida";
    if (typeIdx >= 0) {
      const t = (parts[typeIdx] || "").toLowerCase();
      if (t.includes("d") || t.includes("debit")) type = "saida";
      else if (t.includes("c") || t.includes("credit")) type = "entrada";
    }

    out.push({
      date: dateStr,
      description: descIdx >= 0 ? parts[descIdx] || "" : "",
      amount: Math.abs(amount),
      type,
      raw: { line: lines[i] },
    });
  }
  return out;
}

// ---------- parser OFX simples ----------

function parseOFX(text: string) {
  const out: any[] = [];
  const transactions = text.split(/<STMTTRN>/i).slice(1);
  for (const block of transactions) {
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, "i"));
      return m ? m[1].trim() : "";
    };
    const dt = get("DTPOSTED").slice(0, 8); // yyyymmdd
    const date = dt.length >= 8 ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` : "";
    const amount = parseFloat(get("TRNAMT"));
    const memo = get("MEMO") || get("NAME");
    const fitid = get("FITID");
    const trntype = get("TRNTYPE").toUpperCase();
    if (!date || isNaN(amount) || amount === 0) continue;
    let type: "entrada" | "saida" = amount >= 0 ? "entrada" : "saida";
    if (trntype === "DEBIT") type = "saida";
    else if (trntype === "CREDIT") type = "entrada";
    out.push({
      date,
      description: memo,
      amount: Math.abs(amount),
      type,
      fitid,
      raw: { block: block.slice(0, 200) },
    });
  }
  return out;
}

// ---------- componente principal ----------

export function ReconciliationPanel() {
  const qc = useQueryClient();
  const { data: accounts = [] } = useAccounts();

  const [period, setPeriod] = useState<Period>("30d");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [customStart, setCustomStart] = useState(addDaysISO(todayISO(), -30));
  const [customEnd, setCustomEnd] = useState(todayISO());

  const fileRef = useRef<HTMLInputElement>(null);
  const [importAccount, setImportAccount] = useState<string>("");
  const [importing, setImporting] = useState(false);

  const { periodStart, periodEnd } = useMemo(() => {
    const today = todayISO();
    if (period === "7d") return { periodStart: addDaysISO(today, -7), periodEnd: today };
    if (period === "30d") return { periodStart: addDaysISO(today, -30), periodEnd: today };
    if (period === "mes") {
      const d = new Date();
      return {
        periodStart: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
        periodEnd: today,
      };
    }
    return { periodStart: customStart, periodEnd: customEnd };
  }, [period, customStart, customEnd]);

  // Transações do período
  const { data: txns = [] } = useQuery({
    queryKey: ["txns-recon", periodStart, periodEnd, accountFilter],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select("*")
        .gte("date", periodStart)
        .lte("date", periodEnd)
        .order("date");
      if (accountFilter !== "all") q = q.eq("account_id", accountFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "transaction"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*");
      return data ?? [];
    },
  });

  // Linhas do extrato (banco) do período
  const { data: bankEntries = [] } = useQuery({
    queryKey: ["bank-entries", periodStart, periodEnd, accountFilter],
    queryFn: async () => {
      let q = supabase
        .from("bank_statement_entries")
        .select("*")
        .gte("date", periodStart)
        .lte("date", periodEnd)
        .order("date");
      if (accountFilter !== "all") q = q.eq("account_id", accountFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Sugere matches automáticos: mesma conta + mesmo valor + data próxima (±3 dias)
  const suggestMatch = (entry: any) => {
    const candidates = (txns as any[]).filter((t) => {
      if (t.reconciled) return false;
      if (t.account_id !== entry.account_id) return false;
      const txnAmount = t.type === "saida" ? -Number(t.amount) : Number(t.amount);
      const entryAmount = entry.type === "saida" ? -entry.amount : entry.amount;
      if (Math.abs(txnAmount - entryAmount) > 0.01) return false;
      const dDiff = Math.abs(
        (new Date(t.date).getTime() - new Date(entry.date).getTime()) / 86400000,
      );
      return dDiff <= 3;
    });
    return candidates[0]?.id ?? null;
  };

  const reconcileMutation = useMutation({
    mutationFn: async ({ entryId, txnId }: { entryId: string; txnId: string }) => {
      const entry = (bankEntries as any[]).find((e) => e.id === entryId);
      const { error: e1 } = await supabase
        .from("bank_statement_entries")
        .update({ matched_transaction_id: txnId, status: "conciliado" })
        .eq("id", entryId);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("transactions")
        .update({
          reconciled: true,
          reconciled_at: new Date().toISOString(),
          status: "pago",
          bank_ref: entry?.fitid ?? null,
        })
        .eq("id", txnId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["txns-recon"] });
      qc.invalidateQueries({ queryKey: ["bank-entries"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Conciliado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const ignoreMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("bank_statement_entries")
        .update({ status: "ignorado" })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-entries"] });
      toast.success("Linha ignorada");
    },
  });

  const unreconcileMutation = useMutation({
    mutationFn: async (entry: any) => {
      const { error: e1 } = await supabase
        .from("bank_statement_entries")
        .update({ matched_transaction_id: null, status: "pendente" })
        .eq("id", entry.id);
      if (e1) throw e1;
      if (entry.matched_transaction_id) {
        await supabase
          .from("transactions")
          .update({ reconciled: false, reconciled_at: null, bank_ref: null })
          .eq("id", entry.matched_transaction_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-entries"] });
      qc.invalidateQueries({ queryKey: ["txns-recon"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Conciliação desfeita");
    },
  });

  // Importação de extrato
  const onImportFile = async (file: File) => {
    if (!importAccount) {
      toast.error("Selecione a conta antes de importar");
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      const isOFX = /<OFX>/i.test(text) || file.name.toLowerCase().endsWith(".ofx");
      const parsed = isOFX ? parseOFX(text) : parseCSVStatement(text);

      if (parsed.length === 0) {
        toast.error("Nenhum lançamento identificado no arquivo");
        return;
      }

      // Insert com upsert por (account_id, fitid) quando houver
      let ok = 0;
      let dup = 0;
      for (const p of parsed) {
        try {
          if (p.fitid) {
            const { data: existing } = await supabase
              .from("bank_statement_entries")
              .select("id")
              .eq("account_id", importAccount)
              .eq("fitid", p.fitid)
              .maybeSingle();
            if (existing) {
              dup++;
              continue;
            }
          }
          const { error } = await supabase.from("bank_statement_entries").insert({
            account_id: importAccount,
            date: p.date,
            description: p.description,
            amount: p.amount,
            type: p.type,
            fitid: p.fitid ?? null,
            raw: p.raw,
          });
          if (!error) ok++;
        } catch {
          // pula
        }
      }

      qc.invalidateQueries({ queryKey: ["bank-entries"] });
      toast.success(`${ok} lançamentos importados${dup > 0 ? ` (${dup} já existiam)` : ""}`);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      toast.error(e.message || "Falha ao ler arquivo");
    } finally {
      setImporting(false);
    }
  };

  const exportCSVNow = () => {
    const rows = buildSystemRows(txns as any[], accounts as any[], categories as any[]);
    const fname = `financeiro_${periodStart}_a_${periodEnd}.csv`;
    downloadCSV(rows, fname);
  };
  const exportXLSXNow = () => {
    const rows = buildSystemRows(txns as any[], accounts as any[], categories as any[]);
    const fname = `conciliacao_${periodStart}_a_${periodEnd}.xlsx`;
    downloadXLSX(rows, fname);
  };

  // Estatísticas resumidas
  const pendingBank = (bankEntries as any[]).filter((e) => e.status === "pendente");
  const pendingSystem = (txns as any[]).filter((t) => !t.reconciled && t.status !== "futuro");
  const conciliadas = (txns as any[]).filter((t) => t.reconciled);

  return (
    <div className="space-y-4">
      {/* Filtros + Exportação */}
      <Card className="p-5 shadow-soft">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <Label className="text-xs">Período</Label>
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="mes">Este mês</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {period === "personalizado" && (
            <>
              <div>
                <Label className="text-xs">De</Label>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 w-40" />
              </div>
              <div>
                <Label className="text-xs">Até</Label>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 w-40" />
              </div>
            </>
          )}
          <div>
            <Label className="text-xs">Conta</Label>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="h-9 w-48 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {(accounts as any[]).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} <span className="text-[10px] text-muted-foreground">({a.scope})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCSVNow}>
              <FileDown className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button size="sm" onClick={exportXLSXNow}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Planilha completa
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          <strong>CSV</strong>: lista bruta para abrir no Excel. <strong>Planilha completa</strong>: 3 abas — Sistema, Banco (você cola o extrato), e Conciliação (fórmulas
          que casam valor automaticamente).
        </p>
      </Card>

      {/* Importação de extrato */}
      <Card className="p-5 shadow-soft">
        <h3 className="font-display text-lg font-semibold mb-2">Importar extrato bancário</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Suporta <strong>OFX</strong> (formato padrão dos bancos) e <strong>CSV</strong> com colunas Data, Descrição, Valor.
          O app sugere matches automáticos por valor e data (±3 dias) na sua conta.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Conta de destino</Label>
            <Select value={importAccount} onValueChange={setImportAccount}>
              <SelectTrigger className="h-9 w-56 text-xs"><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
              <SelectContent>
                {(accounts as any[]).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[220px]">
            <Label className="text-xs">Arquivo (.ofx ou .csv)</Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".ofx,.csv,text/csv,application/x-ofx"
              disabled={importing || !importAccount}
              onChange={(e) => e.target.files?.[0] && onImportFile(e.target.files[0])}
            />
          </div>
          {importing && <Loader2 className="h-4 w-4 animate-spin mb-2" />}
        </div>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 shadow-soft border-warning/30">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Banco a conciliar</div>
          <div className="font-display text-2xl font-semibold tabular-nums text-warning">{pendingBank.length}</div>
        </Card>
        <Card className="p-3 shadow-soft border-warning/30">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sistema sem match</div>
          <div className="font-display text-2xl font-semibold tabular-nums text-warning">{pendingSystem.length}</div>
        </Card>
        <Card className="p-3 shadow-soft border-success/30">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Conciliadas</div>
          <div className="font-display text-2xl font-semibold tabular-nums text-success">{conciliadas.length}</div>
        </Card>
      </div>

      {/* Linhas do banco para conciliar */}
      <Card className="p-5 shadow-soft">
        <h3 className="font-display text-lg font-semibold mb-3">
          Lançamentos do banco ({(bankEntries as any[]).length})
        </h3>
        {(bankEntries as any[]).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Importe um extrato acima para começar a conciliar.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {(bankEntries as any[]).map((e: any) => {
              const suggested = e.status === "pendente" ? suggestMatch(e) : null;
              const matched = (txns as any[]).find((t) => t.id === e.matched_transaction_id);
              return (
                <div key={e.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.description || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateBR(e.date)} · {(accounts as any[]).find((a) => a.id === e.account_id)?.name}
                    </div>
                    {matched && (
                      <div className="text-[10px] text-success flex items-center gap-1 mt-1">
                        <Link2 className="h-3 w-3" />
                        Casado com: {matched.description || "—"} ({formatDateBR(matched.date)})
                      </div>
                    )}
                  </div>
                  <span
                    className={`font-display tabular-nums text-sm font-semibold ${
                      e.type === "entrada" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {e.type === "entrada" ? "+" : "-"}
                    {formatBRL(Number(e.amount))}
                  </span>
                  {e.status === "conciliado" ? (
                    <>
                      <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
                        Conciliado
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => unreconcileMutation.mutate(e)} title="Desfazer">
                        <Link2Off className="h-4 w-4" />
                      </Button>
                    </>
                  ) : e.status === "ignorado" ? (
                    <Badge variant="outline" className="text-[10px]">Ignorado</Badge>
                  ) : suggested ? (
                    <>
                      <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/30">
                        Match sugerido
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => reconcileMutation.mutate({ entryId: e.id, txnId: suggested })}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Conciliar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => ignoreMutation.mutate(e.id)} title="Ignorar">
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                        <AlertCircle className="h-3 w-3 mr-1" /> sem match
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => ignoreMutation.mutate(e.id)} title="Ignorar">
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
