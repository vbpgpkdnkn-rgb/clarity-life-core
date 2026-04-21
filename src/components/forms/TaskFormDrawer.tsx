import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories, useGoals, useUpsertTask, useDeleteTask } from "@/hooks/useData";
import { todayISO } from "@/lib/format";
import { Trash2 } from "lucide-react";

export function TaskFormDrawer({
  open,
  onOpenChange,
  task,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task?: any;
  defaultDate?: string;
}) {
  const [form, setForm] = useState<any>({});
  const { data: categories = [] } = useCategories("task");
  const { data: goals = [] } = useGoals();
  const upsert = useUpsertTask();
  const del = useDeleteTask();

  useEffect(() => {
    if (open) {
      setForm(
        task ?? {
          title: "",
          notes: "",
          scope: "pessoal",
          priority: "media",
          status: "pendente",
          due_date: defaultDate ?? todayISO(),
          category_id: null,
          goal_id: null,
        },
      );
    }
  }, [open, task, defaultDate]);

  const save = async () => {
    if (!form.title?.trim()) return;
    const payload = { ...form };
    if (payload.status === "concluida" && !payload.completed_at) {
      payload.completed_at = new Date().toISOString();
    }
    if (payload.status !== "concluida") payload.completed_at = null;
    await upsert.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{task ? "Editar tarefa" : "Nova tarefa"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <Label>Título</Label>
            <Input
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="O que precisa ser feito?"
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
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={form.due_date || ""}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
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
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vincular a meta</Label>
            <Select
              value={form.goal_id ?? "none"}
              onValueChange={(v) => setForm({ ...form, goal_id: v === "none" ? null : v })}
            >
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {goals.filter((g) => g.kind === "tarefas").map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={save} className="flex-1">Salvar</Button>
            {task && (
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  await del.mutateAsync(task.id);
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
