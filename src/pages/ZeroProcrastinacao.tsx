import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Shuffle, Plus, Trash2, CheckCircle2,
  Clock, ArchiveX, Pencil, X, Check,
  Sparkles, ListTodo,
} from "lucide-react";
import { toast } from "sonner";
import {
  useBacklogItems,
  useUpsertBacklogItem,
  useDeleteBacklogItem,
} from "@/hooks/useData";

function daysPending(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diff = now.getTime() - created.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function daysBadgeStyle(days: number): string {
  if (days <= 7) return "bg-muted text-muted-foreground";
  if (days <= 30) return "bg-warning/20 text-warning border-warning/30";
  return "bg-destructive/20 text-destructive border-destructive/30";
}

function daysBadgeLabel(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

export default function ZeroProcrastinacao() {
  const { data: items = [] } = useBacklogItems("pendente");
  const { data: completedItems = [] } = useBacklogItems("concluida");
  const upsert = useUpsertBacklogItem();
  const del = useDeleteBacklogItem();

  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [drawnItem, setDrawnItem] = useState<any>(null);
  const [animating, setAnimating] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const itemsWithDays = useMemo(() =>
    items.map((item: any) => ({
      ...item,
      days: daysPending(item.created_at),
    })),
    [items]
  );

  const drawItem = () => {
    const pending = itemsWithDays.filter((i: any) => i.status === "pendente");
    if (pending.length === 0) {
      toast.info("Sua lista está vazia. Adicione pendências primeiro.");
      return;
    }

    const allDrawnToday = pending.every((i: any) => i.last_drawn_at === today);

    const weighted = pending.map((item: any) => {
      const base = item.days + 1;
      const penalty = !allDrawnToday && item.last_drawn_at === today ? 0.2 : 1;
      return { item, weight: base * penalty };
    });

    const total = weighted.reduce((sum: number, w: any) => sum + w.weight, 0);
    let rand = Math.random() * total;
    let selected = weighted[weighted.length - 1].item;
    for (const w of weighted) {
      rand -= w.weight;
      if (rand <= 0) { selected = w.item; break; }
    }

    setAnimating(true);
    setDrawnItem(null);
    setTimeout(() => {
      setAnimating(false);
      setDrawnItem(selected);
      upsert.mutate({ ...selected, last_drawn_at: today });
    }, 900);
  };

  const addItem = () => {
    const title = newTitle.trim();
    if (!title) return;
    upsert.mutate({
      title,
      notes: newNotes.trim() || null,
      status: "pendente",
    });
    setNewTitle("");
    setNewNotes("");
    setShowNotes(false);
    toast.success("Pendência adicionada ✓");
  };

  const completeItem = (item: any) => {
    upsert.mutate({
      ...item,
      status: "concluida",
      completed_at: new Date().toISOString(),
    });
    if (drawnItem?.id === item.id) setDrawnItem(null);
    toast.success("Pendência resolvida! 🎉");
  };

  const archiveItem = (item: any) => {
    upsert.mutate({ ...item, status: "arquivada" });
    if (drawnItem?.id === item.id) setDrawnItem(null);
    toast.info("Arquivada.");
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditTitle(item.title);
  };

  const saveEdit = (item: any) => {
    if (!editTitle.trim()) return;
    upsert.mutate({ ...item, title: editTitle.trim() });
    setEditingId(null);
  };

  return (
    <AppLayout
      title="Zero Procrastinação"
      subtitle="Pendências acumuladas. Uma por vez."
    >
      <div className="space-y-6 max-w-2xl mx-auto">

        <Card className="overflow-hidden border-2 border-primary/30 shadow-none p-0">
          <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary/40" />
          <div className="p-6">
            {animating && (
              <div className="flex flex-col items-center gap-3 py-6 animate-pulse">
                <Shuffle className="h-10 w-10 text-primary" />
                <p className="text-sm text-muted-foreground">Sorteando...</p>
                <div className="space-y-2 w-full max-w-xs">
                  <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
                  <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
                </div>
              </div>
            )}

            {!animating && drawnItem && (() => {
              const days = daysPending(drawnItem.created_at);
              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Pendência sorteada
                    </span>
                    <Badge className={daysBadgeStyle(days)}>
                      <Clock className="h-3 w-3 mr-1" />
                      Pendente há {daysBadgeLabel(days)}
                    </Badge>
                  </div>

                  <h2 className="font-display text-2xl font-semibold leading-tight mb-2">
                    {drawnItem.title}
                  </h2>

                  {drawnItem.notes && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {drawnItem.notes}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button onClick={() => completeItem(drawnItem)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Resolver agora
                    </Button>
                    <Button variant="outline" onClick={drawItem}>
                      <Shuffle className="h-4 w-4 mr-1" />
                      Sortear outra
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Arquivar"
                      onClick={() => archiveItem(drawnItem)}
                    >
                      <ArchiveX className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })()}

            {!animating && !drawnItem && (
              <div className="flex flex-col items-center py-6 gap-4">
                {items.length === 0 ? (
                  <>
                    <Sparkles className="h-10 w-10 text-primary/40" />
                    <p className="text-sm text-muted-foreground text-center">
                      Nenhuma pendência cadastrada ainda.<br />
                      Adicione uma abaixo para começar.
                    </p>
                  </>
                ) : (
                  <>
                    <Shuffle className="h-10 w-10 text-primary/40" />
                    <p className="text-sm text-muted-foreground text-center">
                      Você tem {items.length} pendência{items.length !== 1 ? "s" : ""}.<br />
                      Deixa o sistema decidir qual fazer agora.
                    </p>
                    <Button onClick={drawItem} className="h-12 px-8 text-base">
                      🎲 Sortear uma pendência
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 border-border/60 shadow-none">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Nova pendência
          </p>
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
              placeholder="Ex: arrumar torneira da pia, renovar CNH..."
              className="h-10"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              title={showNotes ? "Ocultar notas" : "Adicionar notas"}
              onClick={() => setShowNotes((v) => !v)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              onClick={addItem}
              disabled={!newTitle.trim()}
              className="h-10 px-4 shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {showNotes && (
            <Textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Contexto ou observação (opcional)"
              className="mt-2 resize-none text-sm"
              rows={2}
            />
          )}
        </Card>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-muted-foreground" />
              {showCompleted ? "Resolvidas" : `Pendências (${itemsWithDays.length})`}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setShowCompleted((v) => !v)}
            >
              {showCompleted
                ? "Ver pendentes"
                : `Ver resolvidas (${completedItems.length})`}
            </Button>
          </div>

          {!showCompleted && itemsWithDays.length === 0 && (
            <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
              <Sparkles className="h-8 w-8 opacity-40" />
              <p className="text-sm">Nenhuma pendência. Que ótimo! 🎉</p>
            </div>
          )}

          <div className="space-y-1.5">
            {(!showCompleted ? itemsWithDays : completedItems).map((item: any) => {
              const days = daysPending(item.created_at);
              const isEditing = editingId === item.id;
              const isDrawn = drawnItem?.id === item.id;

              return (
                <div
                  key={item.id}
                  className={`group flex items-center gap-3 p-3 rounded-lg transition-all
                    ${isDrawn ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/30"}
                    ${item.status === "concluida" ? "opacity-60" : ""}
                  `}
                >
                  {item.status !== "concluida" ? (
                    <button
                      onClick={() => completeItem(item)}
                      className="h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground/40 hover:border-primary hover:bg-primary/10 transition-colors"
                      title="Marcar como resolvida"
                    />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  )}

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(item);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="h-7 text-sm py-0"
                          autoFocus
                        />
                        <Button size="icon" className="h-7 w-7" onClick={() => saveEdit(item)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className={`text-sm ${item.status === "concluida" ? "line-through" : ""}`}>
                        {item.title}
                      </span>
                    )}
                    {item.notes && !isEditing && (
                      <p className="text-xs text-muted-foreground truncate">{item.notes}</p>
                    )}
                  </div>

                  {days > 0 && item.status !== "concluida" && (
                    <Badge variant="outline" className={`text-xs shrink-0 ${daysBadgeStyle(days)}`}>
                      {daysBadgeLabel(days)}
                    </Badge>
                  )}

                  {item.status !== "concluida" && !isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(item)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/60 hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover pendência?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{item.title}" será removida permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => del.mutate(item.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
