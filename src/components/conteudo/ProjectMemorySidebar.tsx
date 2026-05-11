import { useState } from "react";
import { ChevronDown, Sparkles, Ban, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ContentProject, ContentProjectContext, useUpdateProjectContext } from "@/hooks/useContentProject";

interface Props {
  project: ContentProject;
}

function ChipList({
  items,
  onRemove,
  variant = "default",
}: {
  items: string[];
  onRemove: (i: number) => void;
  variant?: "default" | "destructive";
}) {
  if (!items?.length) return <p className="text-[11px] text-muted-foreground italic">— vazio —</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <Badge
          key={i}
          variant={variant === "destructive" ? "destructive" : "secondary"}
          className="cursor-pointer text-[11px] gap-1 max-w-full"
          onClick={() => onRemove(i)}
          title="Clique para remover"
        >
          <span className="truncate max-w-[180px]">{it}</span>
          <span className="opacity-50">×</span>
        </Badge>
      ))}
    </div>
  );
}

export function ProjectMemorySidebar({ project }: Props) {
  const update = useUpdateProjectContext();
  const ctx = project.context;
  const [open, setOpen] = useState(true);

  const patch = (p: Partial<ContentProjectContext>) =>
    update.mutate({ id: project.id, patch: p });

  const addTo = (
    section: "approved_assets" | "rejected" | "audience",
    field: string,
    value: string,
  ) => {
    if (!value.trim()) return;
    const current = (ctx as any)[section]?.[field] ?? [];
    patch({ [section]: { ...(ctx as any)[section], [field]: [...current, value.trim()] } } as any);
  };

  const removeFrom = (
    section: "approved_assets" | "rejected" | "audience",
    field: string,
    idx: number,
  ) => {
    const current = (ctx as any)[section]?.[field] ?? [];
    const next = current.filter((_: any, i: number) => i !== idx);
    patch({ [section]: { ...(ctx as any)[section], [field]: next } } as any);
  };

  return (
    <Card className="p-3 space-y-3 sticky top-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wide">Memória do Projeto</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pt-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-muted-foreground">Intenção</label>
            <Textarea
              defaultValue={ctx.intent}
              onBlur={(e) => e.target.value !== ctx.intent && patch({ intent: e.target.value })}
              rows={2}
              placeholder="Por que este conteúdo existe..."
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Ângulo</label>
              <Input
                defaultValue={ctx.angle}
                onBlur={(e) => e.target.value !== ctx.angle && patch({ angle: e.target.value })}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Tom</label>
              <Input
                defaultValue={ctx.tone}
                onBlur={(e) => e.target.value !== ctx.tone && patch({ tone: e.target.value })}
                className="text-xs h-8"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Posicionamento</label>
            <Input
              defaultValue={ctx.positioning}
              onBlur={(e) => e.target.value !== ctx.positioning && patch({ positioning: e.target.value })}
              className="text-xs h-8"
            />
          </div>

          {/* Audiência */}
          <details className="text-xs" open>
            <summary className="cursor-pointer text-[10px] uppercase text-muted-foreground mb-1">Audiência</summary>
            <div className="space-y-2 pl-1">
              {(["pains", "desires", "objections"] as const).map((f) => (
                <ChipSection
                  key={f}
                  label={f === "pains" ? "Dores" : f === "desires" ? "Desejos" : "Objeções"}
                  items={(ctx.audience as any)?.[f] ?? []}
                  onAdd={(v) => addTo("audience", f, v)}
                  onRemove={(i) => removeFrom("audience", f, i)}
                />
              ))}
            </div>
          </details>

          {/* Aprovados */}
          <details className="text-xs" open>
            <summary className="cursor-pointer text-[10px] uppercase text-muted-foreground mb-1 flex items-center gap-1">
              <Check className="h-3 w-3 text-primary inline" /> Ativos aprovados
            </summary>
            <div className="space-y-2 pl-1">
              {(["hooks", "metaphors", "examples", "phrases"] as const).map((f) => (
                <ChipSection
                  key={f}
                  label={f === "hooks" ? "Hooks" : f === "metaphors" ? "Metáforas" : f === "examples" ? "Exemplos" : "Frases"}
                  items={(ctx.approved_assets as any)?.[f] ?? []}
                  onAdd={(v) => addTo("approved_assets", f, v)}
                  onRemove={(i) => removeFrom("approved_assets", f, i)}
                />
              ))}
            </div>
          </details>

          {/* Rejeitados */}
          <details className="text-xs">
            <summary className="cursor-pointer text-[10px] uppercase text-muted-foreground mb-1 flex items-center gap-1">
              <Ban className="h-3 w-3 text-destructive inline" /> Rejeitados
            </summary>
            <div className="space-y-2 pl-1">
              {(["hooks", "directions"] as const).map((f) => (
                <ChipSection
                  key={f}
                  label={f === "hooks" ? "Hooks ruins" : "Direções a evitar"}
                  items={(ctx.rejected as any)?.[f] ?? []}
                  onAdd={(v) => addTo("rejected", f, v)}
                  onRemove={(i) => removeFrom("rejected", f, i)}
                  variant="destructive"
                />
              ))}
            </div>
          </details>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t">
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Duração alvo (s)</label>
              <Input
                type="number"
                defaultValue={ctx.timing?.target_seconds ?? 60}
                onBlur={(e) =>
                  patch({ timing: { ...ctx.timing, target_seconds: Number(e.target.value) || 60 } })
                }
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Densidade</label>
              <Input
                defaultValue={ctx.timing?.density ?? "medio"}
                onBlur={(e) =>
                  patch({ timing: { ...ctx.timing, density: e.target.value || "medio" } })
                }
                className="text-xs h-8"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ChipSection({
  label,
  items,
  onAdd,
  onRemove,
  variant,
}: {
  label: string;
  items: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  variant?: "default" | "destructive";
}) {
  const [v, setV] = useState("");
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <ChipList items={items} onRemove={onRemove} variant={variant} />
      <div className="flex gap-1 mt-1">
        <Input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAdd(v);
              setV("");
            }
          }}
          placeholder="+ adicionar"
          className="text-xs h-7"
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => {
            onAdd(v);
            setV("");
          }}
        >
          +
        </Button>
      </div>
    </div>
  );
}
