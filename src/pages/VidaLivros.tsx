import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VidaNav } from "@/components/vida/VidaNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useBooks,
  useUpsertBook,
  useDeleteBook,
  useBookNotes,
  useUpsertBookNote,
  useDeleteBookNote,
  useSendBookNoteToContent,
  useBookReadingPlan,
} from "@/hooks/useVida";
import {
  Plus,
  Trash2,
  BookOpen,
  Star,
  X,
  Calendar,
  Clock,
  Sparkles,
  Lightbulb,
  Quote,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { WeekdayPicker } from "@/components/vida/WeekdayPicker";
import { toast } from "sonner";

const STATUS = [
  { v: "quero_ler", label: "Quero ler" },
  { v: "lendo", label: "Lendo" },
  { v: "lido", label: "Lido" },
  { v: "abandonado", label: "Abandonado" },
];

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function VidaLivros() {
  const { data: books = [] } = useBooks();
  const upsert = useUpsertBook();
  const del = useDeleteBook();
  const planMutation = useBookReadingPlan();
  const [editing, setEditing] = useState<any>(null);
  const [planPreview, setPlanPreview] = useState<any>(null);

  const save = () => {
    if (!editing.title?.trim()) return;
    upsert.mutate(editing);
    setEditing(null);
    setPlanPreview(null);
  };

  const generatePlan = async () => {
    if (!editing.title?.trim()) {
      toast.error("Adicione título antes de gerar plano");
      return;
    }
    if (!editing.pages) {
      toast.error("Informe o número de páginas");
      return;
    }
    try {
      const plan = await planMutation.mutateAsync(editing);
      setPlanPreview(plan);
      setEditing({
        ...editing,
        weekdays: plan.weekdays,
        session_minutes: plan.session_minutes,
        pages_per_session: plan.pages_per_session,
        target_finish_date: plan.target_finish_date,
        plan_notes: `${plan.rationale}\n\nMarcos:\n${plan.weekly_milestones.map((m: string) => `• ${m}`).join("\n")}`,
        time_of_day: editing.time_of_day || "20:00",
      });
      toast.success("Plano gerado! Salve para criar as tarefas automáticas.");
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar plano");
    }
  };

  const grouped = books.reduce((acc: Record<string, any[]>, b: any) => {
    (acc[b.status] ||= []).push(b);
    return acc;
  }, {});

  return (
    <AppLayout
      title="Livros"
      subtitle={`${books.length} no acervo`}
      action={
        <Button
          size="sm"
          onClick={() => {
            setPlanPreview(null);
            setEditing({ title: "", status: "quero_ler", favorite_quotes: [], weekdays: [] });
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo
        </Button>
      }
    >
      <VidaNav />

      {editing && (
        <Card className="p-5 mb-6 border-accent/40">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-display text-lg font-semibold">{editing.id ? "Editar" : "Novo"} livro</h3>
            <button onClick={() => { setEditing(null); setPlanPreview(null); }}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-2 mb-2">
            <Input placeholder="Título" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <Input placeholder="Autor" value={editing.author || ""} onChange={(e) => setEditing({ ...editing, author: e.target.value })} />
            <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Páginas totais"
              value={editing.pages || ""}
              onChange={(e) => setEditing({ ...editing, pages: e.target.value ? parseInt(e.target.value) : null })}
            />
            <Input
              type="number"
              placeholder="Página atual"
              value={editing.current_page || ""}
              onChange={(e) => setEditing({ ...editing, current_page: e.target.value ? parseInt(e.target.value) : 0 })}
            />
            <Input
              type="date"
              placeholder="Quero terminar até"
              value={editing.target_finish_date || ""}
              onChange={(e) => setEditing({ ...editing, target_finish_date: e.target.value || null })}
            />
          </div>

          {(editing.status === "lendo" || editing.status === "quero_ler") && (
            <div className="mb-3 space-y-2 p-3 rounded-md bg-accent/5 border border-accent/30">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-accent" /> Plano de leitura
                </p>
                <Button size="sm" variant="outline" onClick={generatePlan} disabled={planMutation.isPending}>
                  {planMutation.isPending ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Gerando...</>
                  ) : (
                    <><Sparkles className="h-3 w-3 mr-1" /> Gerar com IA</>
                  )}
                </Button>
              </div>

              {planPreview && (
                <div className="text-xs space-y-1 p-2 rounded bg-background/60 border border-accent/20">
                  <p className="font-medium text-accent">
                    {planPreview.pages_per_session} pág × {planPreview.sessions_per_week}x/sem ({planPreview.session_minutes} min) — terminar em {planPreview.target_finish_date}
                  </p>
                  <p className="text-muted-foreground">{planPreview.rationale}</p>
                </div>
              )}

              <div>
                <label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                  <Calendar className="h-3 w-3" /> Dias para ler
                </label>
                <WeekdayPicker
                  value={editing.weekdays || []}
                  onChange={(weekdays) => setEditing({ ...editing, weekdays })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                    <Clock className="h-3 w-3" /> Horário
                  </label>
                  <Input
                    type="time"
                    value={editing.time_of_day || ""}
                    onChange={(e) => setEditing({ ...editing, time_of_day: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Min/sessão</label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={editing.session_minutes || ""}
                    onChange={(e) => setEditing({ ...editing, session_minutes: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Pág/sessão</label>
                  <Input
                    type="number"
                    placeholder="20"
                    value={editing.pages_per_session || ""}
                    onChange={(e) => setEditing({ ...editing, pages_per_session: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
              </div>
              {editing.plan_notes && (
                <Textarea
                  value={editing.plan_notes}
                  onChange={(e) => setEditing({ ...editing, plan_notes: e.target.value })}
                  rows={4}
                  className="text-xs"
                  placeholder="Notas do plano"
                />
              )}
            </div>
          )}

          {editing.status === "lido" && (
            <>
              <div className="mb-2">
                <p className="text-xs text-muted-foreground mb-1">Avaliação</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setEditing({ ...editing, rating: n })}>
                      <Star className={`h-5 w-5 ${(editing.rating || 0) >= n ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <Textarea placeholder="Resumo / sinopse pessoal" value={editing.summary || ""} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} rows={2} className="mb-2" />
              <Textarea placeholder="Citação favorita (separe múltiplas com ---)" value={(editing.favorite_quotes || []).join("\n---\n")} onChange={(e) => setEditing({ ...editing, favorite_quotes: e.target.value.split("\n---\n").filter(Boolean) })} rows={2} className="mb-2" />
              <Textarea placeholder="Aprendizado pessoal" value={editing.takeaways || ""} onChange={(e) => setEditing({ ...editing, takeaways: e.target.value })} rows={2} className="mb-2" />
            </>
          )}

          {editing.id && <BookNotesSection book={editing} />}

          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={save}>Salvar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setPlanPreview(null); }}>Cancelar</Button>
          </div>
        </Card>
      )}

      {STATUS.map((s) => grouped[s.v] && (
        <div key={s.v} className="mb-6">
          <h2 className="font-display text-base font-semibold mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent" /> {s.label} <span className="text-xs text-muted-foreground">({grouped[s.v].length})</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {grouped[s.v].map((b: any) => (
              <Card key={b.id} className="p-3 border-border/60 group cursor-pointer hover:border-accent" onClick={() => { setPlanPreview(null); setEditing(b); }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{b.title}</p>
                    {b.author && <p className="text-xs text-muted-foreground">{b.author}</p>}
                    {b.pages_per_session && b.weekdays?.length > 0 && (
                      <p className="text-[11px] text-accent mt-1 flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" />
                        {b.pages_per_session}p × {b.weekdays.map((d: number) => WEEKDAY_LABELS[d]).join("")}
                        {b.target_finish_date && ` → ${new Date(b.target_finish_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`}
                      </p>
                    )}
                    {b.rating && (
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: b.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-accent text-accent" />)}
                      </div>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); del.mutate(b.id); }} className="opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {books.length === 0 && !editing && (
        <p className="text-sm text-muted-foreground text-center py-12">Adicione seu primeiro livro.</p>
      )}
    </AppLayout>
  );
}

/* ============== NOTAS DO LIVRO ============== */
const NOTE_KINDS = [
  { v: "insight", label: "Insight", icon: Lightbulb, color: "text-amber-500" },
  { v: "summary", label: "Resumo", icon: FileText, color: "text-blue-500" },
  { v: "quote", label: "Citação", icon: Quote, color: "text-purple-500" },
];

function BookNotesSection({ book }: { book: any }) {
  const { data: notes = [] } = useBookNotes(book.id);
  const upsertNote = useUpsertBookNote();
  const delNote = useDeleteBookNote();
  const sendToContent = useSendBookNoteToContent();
  const [draft, setDraft] = useState({ kind: "insight", content: "", page_ref: "" });

  const add = () => {
    if (!draft.content.trim()) return;
    upsertNote.mutate({
      book_id: book.id,
      kind: draft.kind,
      content: draft.content.trim(),
      page_ref: draft.page_ref ? parseInt(draft.page_ref) : null,
    });
    setDraft({ kind: "insight", content: "", page_ref: "" });
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/40">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-accent" />
        <h4 className="text-sm font-display font-semibold">Resumos & Insights</h4>
        <span className="text-xs text-muted-foreground">({notes.length})</span>
      </div>

      <div className="space-y-2 mb-3 p-2 rounded-md bg-muted/30">
        <div className="flex gap-2">
          <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v })}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {NOTE_KINDS.map((k) => (
                <SelectItem key={k.v} value={k.v} className="text-xs">{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Pág."
            className="w-20 h-8 text-xs"
            value={draft.page_ref}
            onChange={(e) => setDraft({ ...draft, page_ref: e.target.value })}
          />
        </div>
        <Textarea
          placeholder={
            draft.kind === "insight"
              ? "O que você aprendeu? Como aplicar?"
              : draft.kind === "summary"
              ? "Resuma o capítulo/trecho..."
              : "Trecho exato do livro..."
          }
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          rows={2}
          className="text-xs"
        />
        <Button size="sm" variant="outline" onClick={add} disabled={!draft.content.trim()}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="space-y-2">
        {notes.map((n: any) => {
          const kind = NOTE_KINDS.find((k) => k.v === n.kind) || NOTE_KINDS[0];
          const Icon = kind.icon;
          return (
            <div key={n.id} className="p-2 rounded-md border border-border/40 bg-card group">
              <div className="flex items-start gap-2">
                <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${kind.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs whitespace-pre-wrap break-words">{n.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">{kind.label}</span>
                    {n.page_ref && <span className="text-[10px] text-muted-foreground">p. {n.page_ref}</span>}
                    {n.sent_to_content && (
                      <span className="text-[10px] text-accent flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" /> em Conteúdo
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  {!n.sent_to_content && (
                    <button
                      onClick={() => sendToContent.mutate({ note: n, book })}
                      title="Enviar para Conteúdo > Ideias"
                      className="text-accent hover:text-accent/70"
                      disabled={sendToContent.isPending}
                    >
                      <Send className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={() => delNote.mutate({ id: n.id, book_id: book.id })}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {notes.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Adicione resumos, insights e citações. Cada um pode virar uma ideia de conteúdo.
          </p>
        )}
      </div>
    </div>
  );
}
