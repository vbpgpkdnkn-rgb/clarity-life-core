import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts, useCategories, useUpsertRecurrence, useDeleteRecurrence } from "@/hooks/useData";
import { Trash2 } from "lucide-react";

export function RecurrenceFormDrawer({
  open,
  onOpenChange,
  rec,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rec?: any;
}) {
  const [form, setForm] = useState<any>({});
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories("transaction");
  const upsert = useUpsertRecurrence();
  const del = useDeleteRecurrence();

  useEffect(() => {
    if (open) {
      setForm(
        rec ?? {
          type: "saida",
          scope: "pessoal",
          frequency: "mensal",
          amount: "",
          description: "",
          day_of_month: new Date().getDate(),
          start_date: new Date().toISOString().slice(0, 10),
          active: true,
          account_id: accounts[0]?.id,
        },
      );
    }
  }, [open, rec, accounts]);

  const save = async () => {
    if (!form.account_id || !form.amount || !form.description) return;
    await upsert.mutateAsync({ ...form, amount: Number(form.amount) });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{rec ? "Editar recorrência" : "Nova recorrência"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setForm({ ...form, type: "entrada" })}
              className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                form.type === "entrada"
                  ? "bg-success text-success-foreground border-success"
                  : "bg-background hover:bg-muted"
              }`}
            >
              Receita
            </button>
            <button
              onClick={() => setForm({ ...form, type: "saida" })}
              className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                form.type === "saida"
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : "bg-background hover:bg-muted"
              }`}
            >
              Despesa
            </button>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Aluguel, Salário, Netflix"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount ?? ""}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Frequência</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          </div>
          {form.frequency === "mensal" && (
            <div>
              <Label>Dia do mês</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.day_of_month ?? ""}
                onChange={(e) => setForm({ ...form, day_of_month: Number(e.target.value) })}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input
                type="date"
                value={form.start_date || ""}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Fim (opcional)</Label>
              <Input
                type="date"
                value={form.end_date || ""}
                onChange={(e) => setForm({ ...form, end_date: e.target.value || null })}
              />
            </div>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select
              value={form.category_id ?? "none"}
              onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categories.filter((c) => c.scope === form.scope).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={save} className="flex-1">Salvar</Button>
            {rec && (
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  await del.mutateAsync(rec.id);
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
