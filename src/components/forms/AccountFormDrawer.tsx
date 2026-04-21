import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpsertAccount } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function AccountFormDrawer({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  account?: any;
}) {
  const [form, setForm] = useState<any>({});
  const upsert = useUpsertAccount();
  const qc = useQueryClient();

  useEffect(() => {
    if (open) {
      setForm(account ?? { name: "", scope: "pessoal", initial_balance: 0 });
    }
  }, [open, account]);

  const save = async () => {
    if (!form.name?.trim()) return;
    await upsert.mutateAsync({ ...form, initial_balance: Number(form.initial_balance || 0) });
    onOpenChange(false);
  };

  const remove = async () => {
    const { error } = await supabase.from("accounts").delete().eq("id", account.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Conta removida");
      qc.invalidateQueries({ queryKey: ["accounts"] });
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{account ? "Editar conta" : "Nova conta"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <Label>Nome</Label>
            <Input
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Nubank, Carteira"
              autoFocus
            />
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
          <div>
            <Label>Saldo inicial (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.initial_balance ?? 0}
              onChange={(e) => setForm({ ...form, initial_balance: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={save} className="flex-1">Salvar</Button>
            {account && (
              <Button variant="outline" size="icon" onClick={remove}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
