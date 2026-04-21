import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { Plus, Check, Trash2, Flame, CheckCircle2, Circle } from "lucide-react";
import {
  ContentStory, StorySlot, STORY_SLOT_LABEL,
  useContentStories, useUpsertStory, useToggleStory, useDeleteStory, useStoriesConsistency,
} from "@/hooks/useStoriesAndReferences";
import { useScope } from "@/contexts/ScopeContext";
import { todayISO, formatDateBR, addDaysISO } from "@/lib/format";
import { toast } from "sonner";

const SLOTS: StorySlot[] = ["bastidores", "rotina", "pergunta", "interacao", "reflexao", "dica", "divulgacao", "outro"];
const TEMPLATE_DEFAULTS: { slot: StorySlot; title: string }[] = [
  { slot: "bastidores", title: "Bastidor do dia" },
  { slot: "rotina", title: "Rotina/dia a dia" },
  { slot: "pergunta", title: "Caixinha de perguntas" },
  { slot: "interacao", title: "Enquete ou quiz" },
];

export function StoriesTab() {
  const { scope } = useScope();
  const { data: stories = [] } = useContentStories(14);
  const upsert = useUpsertStory();
  const toggle = useToggleStory();
  const del = useDeleteStory();
  const cons = useStoriesConsistency(scope === "todos" ? undefined : (scope as any), 7);
  const [editing, setEditing] = useState<Partial<ContentStory> | null>(null);

  const today = todayISO();
  const filteredStories = scope === "todos" ? stories : stories.filter((s) => s.scope === scope);

  // Próximos 7 dias
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(today, i));

  const seedToday = () => {
    let count = 0;
    TEMPLATE_DEFAULTS.forEach((t) => {
      const exists = filteredStories.find((s) => s.date === today && s.slot === t.slot);
      if (!exists) {
        upsert.mutate({
          date: today,
          slot: t.slot,
          title: t.title,
          scope: (scope === "todos" ? "profissional" : scope) as any,
        });
        count++;
      }
    });
    if (count) toast.success(`${count} stories planejados para hoje`);
    else toast.info("Hoje já está planejado");
  };

  return (
    <div className="space-y-4">
      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Consistência (7d)</div>
          <div className="text-2xl font-display font-semibold">{cons.pct}%</div>
          <Progress value={cons.pct} className="h-1.5 mt-2" />
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Flame className="h-3 w-3 text-warning" /> Streak
          </div>
          <div className="text-2xl font-display font-semibold">
            {cons.streak} <span className="text-base text-muted-foreground font-normal">dias</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Stories hoje</div>
          <div className="text-2xl font-display font-semibold">
            {cons.todayDone}<span className="text-base text-muted-foreground font-normal"> / {cons.todayPlanned}</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Dias produtivos</div>
          <div className="text-2xl font-display font-semibold">
            {cons.productiveDays}<span className="text-base text-muted-foreground font-normal"> / {cons.totalDays}</span>
          </div>
        </Card>
      </div>

      {/* Ações rápidas */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="font-display font-semibold">Stories de hoje</h3>
            <p className="text-xs text-muted-foreground">Planeje slots e marque como feitos.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={seedToday}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Template padrão
            </Button>
            <Button size="sm" onClick={() => setEditing({ date: today, slot: "outro", title: "", scope: (scope === "todos" ? "profissional" : scope) as any })}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Story
            </Button>
          </div>
        </div>
      </Card>

      {/* Calendário 7 dias */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map((d) => {
          const items = filteredStories.filter((s) => s.date === d);
          const isToday = d === today;
          const allDone = items.length > 0 && items.every((i) => i.done);
          return (
            <Card
              key={d}
              className={`p-3 min-h-[140px] ${
                isToday ? "border-accent/50 bg-accent/5" : ""
              } ${allDone ? "border-success/30" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {formatDateBR(d)}
                </div>
                {allDone && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
              </div>
              <div className="space-y-1.5">
                {items.map((s) => (
                  <div key={s.id} className="group flex items-start gap-1.5">
                    <button
                      onClick={() => toggle.mutate({ id: s.id, done: !s.done })}
                      className="mt-0.5 shrink-0"
                    >
                      {s.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditing(s)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className={`text-[11px] font-medium leading-tight ${s.done ? "line-through text-muted-foreground" : ""}`}>
                        {s.title}
                      </div>
                      <Badge variant="outline" className="text-[9px] mt-0.5 px-1 py-0">
                        {STORY_SLOT_LABEL[s.slot]}
                      </Badge>
                    </button>
                  </div>
                ))}
                {items.length === 0 && (
                  <button
                    onClick={() =>
                      setEditing({ date: d, slot: "outro", title: "", scope: (scope === "todos" ? "profissional" : scope) as any })
                    }
                    className="w-full text-[10px] text-muted-foreground py-2 hover:text-foreground"
                  >
                    + adicionar
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Drawer */}
      {editing && (
        <Drawer open onOpenChange={() => setEditing(null)}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{editing.id ? "Editar story" : "Novo story"}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 space-y-3">
              <div>
                <Label>Título</Label>
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Ex: Bastidor da gravação"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={editing.date ?? today}
                    onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={editing.slot ?? "outro"}
                    onValueChange={(v) => setEditing({ ...editing, slot: v as StorySlot })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SLOTS.map((s) => (
                        <SelectItem key={s} value={s}>{STORY_SLOT_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea
                  rows={3}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
            </div>
            <DrawerFooter className="flex-row gap-2">
              {editing.id && (
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    del.mutate(editing.id!);
                    setEditing(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
              )}
              <div className="flex-1" />
              <Button
                onClick={() => {
                  if (!editing.title?.trim()) {
                    toast.error("Dê um título");
                    return;
                  }
                  upsert.mutate(
                    {
                      ...editing,
                      title: editing.title!,
                      scope: (editing.scope ?? (scope === "todos" ? "profissional" : scope)) as any,
                    } as any,
                    { onSuccess: () => setEditing(null) },
                  );
                }}
              >
                <Check className="h-4 w-4 mr-1" /> Salvar
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
