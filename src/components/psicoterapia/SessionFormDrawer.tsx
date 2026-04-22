import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUpsertTherapySession, useDeleteTherapySession, usePatients, useCreateNextSessionTask } from "@/hooks/usePsicoterapia";
import { todayISO } from "@/lib/format";
import { MicButton } from "@/components/MicButton";
import { Trash2, FileCheck2, ListPlus } from "lucide-react";
import { toast } from "sonner";

export function SessionFormDrawer({
  open,
  onOpenChange,
  session,
  defaultDate,
  defaultPatientId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session?: any;
  defaultDate?: string;
  defaultPatientId?: string;
}) {
  const [form, setForm] = useState<any>({});
  const [nextTaskTitle, setNextTaskTitle] = useState("");
  const upsert = useUpsertTherapySession();
  const del = useDeleteTherapySession();
  const createNextTask = useCreateNextSessionTask();
  const { data: patients = [] } = usePatients();

  useEffect(() => {
    if (open) {
      const base = session ?? {
        patient_id: defaultPatientId ?? "",
        date: defaultDate ?? todayISO(),
        start_time: "",
        duration_minutes: 50,
        modality: "online",
        status: "agendada",
        chart_updated: false,
        internal_notes: "",
      };
      // Auto-preenche duração a partir do paciente em sessão nova
      if (!session && base.patient_id) {
        const p = (patients as any[]).find((x) => x.id === base.patient_id);
        if (p) {
          base.duration_minutes = p.default_duration_minutes ?? 50;
        }
      }
      setForm(base);
      setNextTaskTitle("");
    }
  }, [open, session, defaultDate, defaultPatientId, patients]);

  const onPatientChange = (id: string) => {
    const p = (patients as any[]).find((x) => x.id === id);
    setForm((prev: any) => ({
      ...prev,
      patient_id: id,
      duration_minutes: prev.id ? prev.duration_minutes : p?.default_duration_minutes ?? prev.duration_minutes,
    }));
  };

  const save = async () => {
    if (!form.patient_id) {
      toast.error("Selecione um paciente para salvar a sessão.");
      return;
    }
    if (!form.date) {
      toast.error("Defina a data da sessão.");
      return;
    }
    const payload: any = { ...form };
    if (!payload.start_time) payload.start_time = null;
    try {
      const savedId = await upsert.mutateAsync(payload);
      if (nextTaskTitle.trim()) {
        await createNextTask.mutateAsync({
          patient_id: form.patient_id,
          title: nextTaskTitle.trim(),
          session_date: form.date,
          session_id: (savedId as string) || session?.id,
        });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar a sessão");
    }
  };

  const patient = (patients as any[]).find((p) => p.id === form.patient_id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">
            {session ? "Editar sessão" : "Nova sessão"}
            {patient && <div className="text-sm text-muted-foreground font-normal mt-1">{patient.name}</div>}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <Label>Paciente</Label>
            <Select value={form.patient_id || ""} onValueChange={onPatientChange}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {(patients as any[]).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date || ""}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Horário</Label>
              <Input
                type="time"
                value={form.start_time || ""}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duração (min)</Label>
              <Input
                type="number"
                value={form.duration_minutes ?? 50}
                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 50 })}
              />
            </div>
            <div>
              <Label>Modalidade</Label>
              <Select value={form.modality || "online"} onValueChange={(v) => setForm({ ...form, modality: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Status da sessão</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agendada">Agendada</SelectItem>
                <SelectItem value="realizada">Realizada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="falta">Falta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Prontuário */}
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-accent">
                <FileCheck2 className="h-3.5 w-3.5" /> Prontuário evoluído
              </div>
              <Switch
                checked={!!form.chart_updated}
                onCheckedChange={(v) => setForm({ ...form, chart_updated: v })}
              />
            </div>
            <div>
              <Label className="text-xs">Notas internas (não substitui o prontuário)</Label>
              <div className="relative">
                <Textarea
                  value={form.internal_notes || ""}
                  onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
                  rows={3}
                  className="pr-11"
                  placeholder="Pontos a retomar, lembretes operacionais..."
                />
                <div className="absolute right-1.5 top-1.5">
                  <MicButton
                    value={form.internal_notes || ""}
                    onChange={(v) => setForm({ ...form, internal_notes: v })}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tarefa para a próxima sessão (vira task com vencimento +7 dias) */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <ListPlus className="h-3.5 w-3.5" /> Tarefa para a próxima sessão
            </div>
            <div className="relative">
              <Input
                value={nextTaskTitle}
                onChange={(e) => setNextTaskTitle(e.target.value)}
                placeholder="Ex.: Retomar combinado sobre limite com a mãe"
                className="pr-11"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <MicButton
                  value={nextTaskTitle}
                  onChange={setNextTaskTitle}
                  size="sm"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Ao salvar, vira uma tarefa profissional vinculada ao paciente, com vencimento 7 dias depois desta sessão.
            </p>
          </div>

          <p className="text-[10px] text-muted-foreground -mt-1">
            💡 Valor e pagamento da sessão são lançados manualmente em <strong>Financeiro → Transação</strong> (escopo profissional).
          </p>

          <div className="flex gap-2 pt-4">
            <Button onClick={save} className="flex-1">Salvar</Button>
            {session && (
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  if (!confirm("Remover esta sessão?")) return;
                  await del.mutateAsync(session.id);
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
