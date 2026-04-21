import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VidaNav } from "@/components/vida/VidaNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBooks, useUpsertBook, useDeleteBook } from "@/hooks/useVida";
import { Plus, Trash2, BookOpen, Star, X } from "lucide-react";

const STATUS = [
  { v: "quero_ler", label: "Quero ler" },
  { v: "lendo", label: "Lendo" },
  { v: "lido", label: "Lido" },
  { v: "abandonado", label: "Abandonado" },
];

export default function VidaLivros() {
  const { data: books = [] } = useBooks();
  const upsert = useUpsertBook();
  const del = useDeleteBook();
  const [editing, setEditing] = useState<any>(null);

  const save = () => {
    if (!editing.title?.trim()) return;
    upsert.mutate(editing);
    setEditing(null);
  };

  const grouped = books.reduce((acc: Record<string, any[]>, b: any) => {
    (acc[b.status] ||= []).push(b);
    return acc;
  }, {});

  return (
    <AppLayout
      title="Livros"
      subtitle={`${books.length} no acervo`}
      action={<Button size="sm" onClick={() => setEditing({ title: "", status: "quero_ler", favorite_quotes: [] })}><Plus className="h-4 w-4 mr-1" />Novo</Button>}
    >
      <VidaNav />

      {editing && (
        <Card className="p-5 mb-6 border-accent/40">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-display text-lg font-semibold">{editing.id ? "Editar" : "Novo"} livro</h3>
            <button onClick={() => setEditing(null)}><X className="h-4 w-4" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 mb-2">
            <Input placeholder="Título" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <Input placeholder="Autor" value={editing.author || ""} onChange={(e) => setEditing({ ...editing, author: e.target.value })} />
            <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" placeholder="Páginas" value={editing.pages || ""} onChange={(e) => setEditing({ ...editing, pages: e.target.value ? parseInt(e.target.value) : null })} />
          </div>
          {editing.status === "lido" && (
            <>
              <div className="mb-2">
                <p className="text-xs text-muted-foreground mb-1">Avaliação</p>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((n) => (
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
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={save}>Salvar</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
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
              <Card key={b.id} className="p-3 border-border/60 group cursor-pointer hover:border-accent" onClick={() => setEditing(b)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{b.title}</p>
                    {b.author && <p className="text-xs text-muted-foreground">{b.author}</p>}
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
