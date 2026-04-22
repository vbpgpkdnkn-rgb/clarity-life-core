import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpsertPatient, useDeletePatient } from "@/hooks/usePsicoterapia";
import { MicButton } from "@/components/MicButton";
import { Trash2 } from "lucide-react";

export function PatientFormDrawer({
  open,
  onOpenChange,
  patient,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient?: any;
}) {
  const [form, setForm] = useState<any>({});
  const upsert = useUpsertPatient();
  const del = useDeletePatient();

  useEffect(() => {
    if (open) {
      setForm(
        patient ?? {
          name: "",
          email: "",
          phone: "",
          birth_date: "",
          default_session_price: 0,
          default_duration_minutes: 50,
          status: "ativo",
          notes: "",
          external_ref: "",
        },
      );
    }
  }, [open, patient]);

  const save = async () => {
    if (!form.name?.trim()) return;
    const payload = { ...form };
    if (!payload.birth_date) payload.birth_date = null;
    if (!payload.email) payload.email = null;
    if (!payload.phone) payload.phone = null;
    if (!payload.external_ref) payload.external_ref = null;
    await upsert.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">
            {patient ? "Editar paciente" : "Novo paciente"}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <Label>Nome</Label>
            <div className="flex gap-2">
              <Input
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome completo"
                autoFocus
              />
              <MicButton value={form.name || ""} onChange={(v) => setForm({ ...form, name: v })} size="md" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nascimento</Label>
              <Input
                type="date"
                value={form.birth_date || ""}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor padrão (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.default_session_price ?? 0}
                onChange={(e) =>
                  setForm({ ...form, default_session_price: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Duração padrão (min)</Label>
              <Input
                type="number"
                value={form.default_duration_minutes ?? 50}
                onChange={(e) =>
                  setForm({ ...form, default_duration_minutes: parseInt(e.target.value) || 50 })
                }
              />
            </div>
          </div>
          <div>
            <Label>Referência externa <span className="text-[10px] text-muted-foreground">(ID do prontuário)</span></Label>
            <Input
              value={form.external_ref || ""}
              onChange={(e) => setForm({ ...form, external_ref: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <div>
            <Label>Notas internas</Label>
            <div className="relative">
              <Textarea
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="pr-11"
                placeholder="Nada clínico — só anotações operacionais"
              />
              <div className="absolute right-1.5 top-1.5">
                <MicButton value={form.notes || ""} onChange={(v) => setForm({ ...form, notes: v })} size="sm" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={save} className="flex-1">Salvar</Button>
            {patient && (
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  if (!confirm("Remover este paciente e todas as sessões?")) return;
                  await del.mutateAsync(patient.id);
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
