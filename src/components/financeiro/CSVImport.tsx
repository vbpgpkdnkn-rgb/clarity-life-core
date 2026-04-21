import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAccounts, useCategories, useUpsertTransaction } from "@/hooks/useData";
import { Upload } from "lucide-react";
import { toast } from "sonner";

/** Parses a CSV (very tolerant): tries to find date, description, amount. */
function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const sep = (lines[0].match(/;/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? ";" : ",";
  const header = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const findIdx = (...keys: string[]) => header.findIndex((h) => keys.some((k) => h.includes(k)));
  const dateIdx = findIdx("data", "date");
  const descIdx = findIdx("desc", "histor", "memo");
  const amtIdx = findIdx("valor", "amount", "montante");
  if (dateIdx === -1 || amtIdx === -1) return [];

  const out: { date: string; description: string; amount: number }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep).map((s) => s.trim().replace(/^"|"$/g, ""));
    const dateRaw = parts[dateIdx];
    const desc = descIdx >= 0 ? parts[descIdx] : "";
    let amtRaw = parts[amtIdx] || "0";
    amtRaw = amtRaw.replace(/\./g, "").replace(",", ".");
    const amount = parseFloat(amtRaw);
    if (isNaN(amount)) continue;
    let date = dateRaw;
    const dmy = dateRaw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmy) date = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    out.push({ date, description: desc, amount });
  }
  return out;
}

export function CSVImport({ accountId, scope }: { accountId: string; scope: "pessoal" | "profissional" }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upsert = useUpsertTransaction();

  const handleFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) {
      toast.error("Não consegui ler o CSV. Use colunas: Data, Descrição, Valor");
      return;
    }
    let ok = 0;
    for (const r of rows) {
      try {
        await upsert.mutateAsync({
          account_id: accountId,
          type: r.amount >= 0 ? "entrada" : "saida",
          nature: "variavel",
          scope,
          amount: Math.abs(r.amount),
          description: r.description,
          date: r.date,
          status: "pendente", // imported = pending reconciliation
        });
        ok++;
      } catch (e) {}
    }
    toast.success(`${ok} transações importadas (status: pendente)`);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4 mr-1" /> Importar CSV
      </Button>
    </>
  );
}
