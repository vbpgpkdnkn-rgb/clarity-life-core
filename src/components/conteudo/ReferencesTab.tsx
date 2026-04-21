import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ExternalLink, Trash2, Wand2, Plus } from "lucide-react";
import {
  useContentReferences, useDeleteReference, useAnalyzeReference,
} from "@/hooks/useStoriesAndReferences";
import { useUpsertPiece } from "@/hooks/useContent";
import { useScope } from "@/contexts/ScopeContext";
import { formatDateBR } from "@/lib/format";
import { toast } from "sonner";

export function ReferencesTab({ ownThemes }: { ownThemes: string[] }) {
  const { scope } = useScope();
  const { data: refs = [] } = useContentReferences();
  const analyze = useAnalyzeReference();
  const del = useDeleteReference();
  const upsertPiece = useUpsertPiece();

  const [form, setForm] = useState({ source_text: "", source_url: "", source_author: "" });

  const submit = () => {
    if (!form.source_text.trim() && !form.source_url.trim()) {
      toast.error("Cole o texto OU o link do post");
      return;
    }
    analyze.mutate(
      {
        source_text: form.source_text.trim() || undefined,
        source_url: form.source_url.trim() || undefined,
        source_author: form.source_author.trim() || undefined,
        scope: (scope === "todos" ? "profissional" : scope) as any,
        own_themes: ownThemes,
      },
      {
        onSuccess: () => setForm({ source_text: "", source_url: "", source_author: "" }),
      },
    );
  };

  const createPiece = (r: any) => {
    upsertPiece.mutate({
      title: r.adapted_title,
      format: (r.adapted_format ?? "reels") as any,
      hook: r.adapted_hook,
      script: r.adapted_outline,
      status: "ideia",
      scope: r.scope,
      notes: `Adaptado de referência:\n${r.source_author ? `Autor: ${r.source_author}\n` : ""}${r.source_url ? `Link: ${r.source_url}\n` : ""}`,
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="h-4 w-4 text-accent" />
          <div>
            <h3 className="font-display font-semibold">Inserir post de referência</h3>
            <p className="text-xs text-muted-foreground">
              Cole texto, link ou autor. A IA adapta para o seu nicho.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Texto do post</Label>
            <Textarea
              rows={4}
              placeholder="Cole o texto do post aqui..."
              value={form.source_text}
              onChange={(e) => setForm({ ...form, source_text: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Link (opcional)</Label>
              <Input
                placeholder="https://..."
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              />
            </div>
            <div>
              <Label>Autor (opcional)</Label>
              <Input
                placeholder="@usuario"
                value={form.source_author}
                onChange={(e) => setForm({ ...form, source_author: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={submit} disabled={analyze.isPending}>
            <Sparkles className="h-4 w-4 mr-1" />
            {analyze.isPending ? "Analisando…" : "Analisar e adaptar"}
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {refs.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma referência analisada ainda.
          </Card>
        )}
        {refs.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {r.adapted_format && <Badge variant="outline" className="text-[10px]">{r.adapted_format}</Badge>}
                  {r.source_author && <span className="text-xs text-muted-foreground">de {r.source_author}</span>}
                  <span className="text-[10px] text-muted-foreground">{formatDateBR(r.created_at)}</span>
                  {r.source_url && (
                    <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> link
                    </a>
                  )}
                </div>
                {r.adapted_title && (
                  <div className="font-display font-semibold">{r.adapted_title}</div>
                )}
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del.mutate(r.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {r.adapted_hook && (
              <div className="rounded bg-accent/5 border border-accent/20 p-2 mb-2">
                <div className="text-[10px] uppercase tracking-widest text-accent">Hook</div>
                <div className="text-sm">{r.adapted_hook}</div>
              </div>
            )}

            {r.adapted_outline && (
              <details className="text-sm">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Ver roteiro adaptado
                </summary>
                <pre className="whitespace-pre-wrap text-xs mt-2 p-2 bg-muted/30 rounded">{r.adapted_outline}</pre>
              </details>
            )}

            {r.analysis && (r.analysis.why_it_works || r.analysis.theme) && (
              <details className="text-xs mt-2">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Análise do original
                </summary>
                <div className="mt-2 space-y-1 p-2 bg-muted/30 rounded">
                  {r.analysis.theme && <div><strong>Tema:</strong> {r.analysis.theme}</div>}
                  {r.analysis.structure && <div><strong>Estrutura:</strong> {r.analysis.structure}</div>}
                  {r.analysis.why_it_works && <div><strong>Por que funciona:</strong> {r.analysis.why_it_works}</div>}
                </div>
              </details>
            )}

            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => createPiece(r)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Criar peça
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
