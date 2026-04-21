import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VidaNav } from "@/components/vida/VidaNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWishlist, useUpsertWishlist, useDeleteWishlist } from "@/hooks/useVida";
import { Plus, Trash2, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { formatBRL } from "@/lib/format";

const CATS = [
  { v: "compra", label: "Compra" },
  { v: "experiencia", label: "Experiência" },
  { v: "viagem", label: "Viagem" },
  { v: "presente", label: "Presente" },
  { v: "outro", label: "Outro" },
];

export default function VidaDesejos() {
  const { data: items = [] } = useWishlist();
  const upsert = useUpsertWishlist();
  const del = useDeleteWishlist();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<any>({ name: "", category: "compra", priority: "media", estimated_price: "", url: "" });

  const save = () => {
    if (!form.name.trim()) return;
    const payload = { ...form, estimated_price: form.estimated_price ? parseFloat(form.estimated_price) : null };
    upsert.mutate(payload);
    setForm({ name: "", category: "compra", priority: "media", estimated_price: "", url: "" });
    setAdding(false);
  };

  const open = items.filter((i: any) => !i.acquired);
  const done = items.filter((i: any) => i.acquired);
  const total = open.reduce((s: number, i: any) => s + (Number(i.estimated_price) || 0), 0);

  return (
    <AppLayout
      title="Lista de desejos"
      subtitle={`${open.length} itens · ${formatBRL(total)} estimado`}
      action={<Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4 mr-1" />Novo</Button>}
    >
      <VidaNav />

      {adding && (
        <Card className="p-4 mb-4 border-accent/40">
          <div className="grid sm:grid-cols-2 gap-2">
            <Input placeholder="O que você deseja" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input type="number" step="0.01" placeholder="Preço estimado" value={form.estimated_price} onChange={(e) => setForm({ ...form, estimated_price: e.target.value })} />
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c.v} value={c.v}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Input className="sm:col-span-2" placeholder="URL (opcional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-2"><Button size="sm" onClick={save}>Salvar</Button><Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button></div>
        </Card>
      )}

      <div className="space-y-1 mb-8">
        {open.map((i: any) => (
          <Card key={i.id} className="p-3 border-border/60 group">
            <div className="flex items-center gap-3">
              <button onClick={() => upsert.mutate({ id: i.id, acquired: true, acquired_at: new Date().toISOString() })}>
                <Circle className="h-4 w-4 text-muted-foreground hover:text-accent" />
              </button>
              <div className="flex-1">
                <p className="text-sm">{i.name}</p>
                <p className="text-xs text-muted-foreground">
                  {CATS.find((c) => c.v === i.category)?.label}
                  {i.estimated_price && ` · ${formatBRL(i.estimated_price)}`}
                  {` · prioridade ${i.priority}`}
                </p>
              </div>
              {i.url && <a href={i.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent"><ExternalLink className="h-3.5 w-3.5" /></a>}
              <button onClick={() => del.mutate(i.id)} className="opacity-0 group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {done.length > 0 && (
        <>
          <h3 className="text-sm text-muted-foreground mb-2">Adquiridos</h3>
          <div className="space-y-1">
            {done.map((i: any) => (
              <Card key={i.id} className="p-3 border-border/60 group opacity-50">
                <div className="flex items-center gap-3">
                  <button onClick={() => upsert.mutate({ id: i.id, acquired: false, acquired_at: null })}>
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                  </button>
                  <p className="text-sm flex-1 line-through">{i.name}</p>
                  <button onClick={() => del.mutate(i.id)} className="opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </AppLayout>
  );
}
