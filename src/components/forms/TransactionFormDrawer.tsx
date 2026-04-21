import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts, useCategories, useGoals, useUpsertTransaction, useDeleteTransaction } from "@/hooks/useData";
import { todayISO } from "@/lib/format";
import { Trash2 } from "lucide-react";

export function TransactionFormDrawer({
  open,
  onOpenChange,
  txn,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  txn?: any;
}) {
  const [form, setForm] = useState<any>({});
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories("transaction");
  const { data: goals = [] } = useGoals();
  const upsert = useUpsertTransaction();
  const del = useDeleteTransaction();

  useEffect(() => {
    if (open) {
      setForm(
        txn ?? {
          type: "saida",
          nature: "variavel",
          scope: "pessoal",
          status: "conciliado",
          amount: "",
          description: "",
          date: todayISO(),
          account_id: accounts[0]?.id,
          to_account_id: null,
          category_id: null,
          goal_id: null,
        },
      );
    }
  }, [open, txn, accounts]);

  const save = async () => {
    if (!form.account_id || !form.amount) return;
    await upsert.mutateAsync({ ...form, amount: Number(form.amount) });
    onOpenChange(false);
  };

  const filteredCategories = categories.filter((c) => c.scope === form.scope);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{txn ? "Editar transação" : "Nova transação"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-3 gap-2">
            {(["entrada", "saida", "transferencia"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, type: t })}
                className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                  form.type === t
                    ? t === "entrada"
                      ? "bg-success text-success-foreground border-success"
                      : t === "saida"
                      ? "bg-destructive text-destructive-foreground border-destructive"
                      : "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {t === "saida" ? "Saída" : t === "entrada" ? "Entrada" : "Transfer."}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount ?? ""}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Input
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Mercado da semana"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Conta</Label>
              <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.type === "transferencia" ? (
              <div>
                <Label>Para conta</Label>
                <Select
                  value={form.to_account_id ?? ""}
                  onValueChange={(v) => setForm({ ...form, to_account_id: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a) => a.id !== form.account_id).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.category_id ?? "none"}
                  onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Escopo</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                  <SelectItem value="profissional">Profissional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.nature} onValueChange={(v) => setForm({ ...form, nature: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixo">Fixo</SelectItem>
                  <SelectItem value="variavel">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conciliado">Conciliado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.type !== "transferencia" && (
            <div>
              <Label>Vincular a meta financeira</Label>
              <Select
                value={form.goal_id ?? "none"}
                onValueChange={(v) => setForm({ ...form, goal_id: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {goals.filter((g) => g.kind === "financeiro").map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Notas</Label>
            <Textarea
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={save} className="flex-1">Salvar</Button>
            {txn && (
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  await del.mutateAsync(txn.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
