import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpsertGoal, useDeleteGoal, useMilestones, useUpsertMilestone, useDeleteMilestone } from "@/hooks/useData";
import { Trash2, Plus, Check } from "lucide-react";

export function GoalFormDrawer({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goal?: any;
}) {
  const [form, setForm] = useState<any>({});
  const upsert = useUpsertGoal();
  const del = useDeleteGoal();
  const { data: milestones = [] } = useMilestones(goal?.id);
  const upsertMilestone = useUpsertMilestone();
  const deleteMilestone = useDeleteMilestone();
  const [newMilestone, setNewMilestone] = useState("");

  useEffect(() => {
    if (open) {
      setForm(
        goal ?? {
          name: "",
          description: "",
          scope: "pessoal",
          kind: "tarefas",
          target_value: null,
          deadline: null,
          status: "ativa",
        },
      );
    }
  }, [open, goal]);

  const save = async () => {
    if (!form.name?.trim()) return;
    const payload = { ...form };
    if (payload.target_value === "") payload.target_value = null;
    else if (payload.target_value != null) payload.target_value = Number(payload.target_value);
    await upsert.mutateAsync(payload);
    if (!goal) onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{goal ? "Editar meta" : "Nova meta"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <Label>Nome</Label>
            <Input
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Reserva de emergência"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tarefas">Por tarefas</SelectItem>
                  <SelectItem value="financeiro">Financeira</SelectItem>
                  <SelectItem value="marcos">Por marcos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {form.kind === "financeiro" && (
              <div>
                <Label>Valor alvo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.target_value ?? ""}
                  onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label>Prazo</Label>
              <Input
                type="date"
                value={form.deadline || ""}
                onChange={(e) => setForm({ ...form, deadline: e.target.value || null })}
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="pausada">Pausada</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>

          {goal && form.kind === "marcos" && (
            <div>
              <Label className="mb-2 block">Marcos</Label>
              <div className="space-y-1 mb-2">
                {milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() =>
                        upsertMilestone.mutate({ id: m.id, goal_id: goal.id, done: !m.done })
                      }
                      className={`h-5 w-5 rounded border flex items-center justify-center ${
                        m.done ? "bg-accent border-accent text-accent-foreground" : "border-border"
                      }`}
                    >
                      {m.done && <Check className="h-3 w-3" />}
                    </button>
                    <span className={`text-sm flex-1 ${m.done ? "line-through text-muted-foreground" : ""}`}>
                      {m.name}
                    </span>
                    <button
                      onClick={() => deleteMilestone.mutate({ id: m.id, goal_id: goal.id })}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Novo marco..."
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newMilestone.trim()) {
                      upsertMilestone.mutate({ goal_id: goal.id, name: newMilestone.trim(), position: milestones.length });
                      setNewMilestone("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (newMilestone.trim()) {
                      upsertMilestone.mutate({ goal_id: goal.id, name: newMilestone.trim(), position: milestones.length });
                      setNewMilestone("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={save} className="flex-1">Salvar</Button>
            {goal && (
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  await del.mutateAsync(goal.id);
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
