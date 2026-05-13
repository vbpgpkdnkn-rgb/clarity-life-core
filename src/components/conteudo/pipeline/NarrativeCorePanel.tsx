import { useEffect, useState } from "react";
import { Sparkles, Edit3, X, Compass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUpdateNarrativeCore } from "@/hooks/usePipelineEditor";
import type { ContentProject } from "@/hooks/useContentProject";

const FIELDS: { key: string; label: string; hint: string; long?: boolean }[] = [
  { key: "intent", label: "Intenção", hint: "Por que este conteúdo precisa existir?" },
  { key: "promise", label: "Promessa", hint: "O que o espectador leva embora?" },
  { key: "tension", label: "Tensão", hint: "Que conflito mantém atenção?", long: true },
  { key: "positioning", label: "Posicionamento", hint: "Como você se mostra aqui?" },
  { key: "tone", label: "Tom", hint: "Qual a temperatura emocional?" },
  { key: "emotional_goal", label: "Objetivo emocional", hint: "Que sensação você quer deixar?" },
];

export function NarrativeCorePanel({ project }: { project: ContentProject }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateNarrativeCore();
  const core = ((project.context as any)?.narrative_core ?? {}) as Record<string, string>;
  const [draft, setDraft] = useState<Record<string, string>>(core);
  useEffect(() => { setDraft(core); }, [project.id]);

  const filled = FIELDS.filter((f) => (core[f.key] ?? "").toString().trim());

  if (!editing) {
    return (
      <TooltipProvider delayDuration={200}>
        <Card className="px-3 py-2 border-primary/20 bg-gradient-to-r from-accent/5 via-transparent to-transparent flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 shrink-0">
            <Compass className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Bússola</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 flex-1 min-w-0">
            {filled.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Defina o núcleo narrativo para ancorar todas as decisões da IA.</span>
            ) : (
              filled.map((f) => (
                <Tooltip key={f.key}>
                  <TooltipTrigger asChild>
                    <div className="flex items-baseline gap-1.5 min-w-0 max-w-[220px]">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">{f.label}</span>
                      <span className="text-xs font-medium truncate" style={{ fontFamily: "Fraunces, serif" }}>
                        {core[f.key]}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{f.label}</p>
                    <p className="text-sm" style={{ fontFamily: "Fraunces, serif" }}>{core[f.key]}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 italic">{f.hint}</p>
                  </TooltipContent>
                </Tooltip>
              ))
            )}
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setEditing(true)}>
            <Edit3 className="h-3 w-3 mr-1" /> Ajustar
          </Button>
        </Card>
      </TooltipProvider>
    );
  }

  return (
    <Card className="p-4 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold">Núcleo narrativo</h3>
          <span className="text-[10px] text-muted-foreground italic">a IA herda estas decisões em toda a esteira</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</label>
            {f.long ? (
              <Textarea rows={2} placeholder={f.hint} value={draft[f.key] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                className="text-sm" style={{ fontFamily: "Fraunces, serif" }} />
            ) : (
              <Input placeholder={f.hint} value={draft[f.key] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                className="text-sm" style={{ fontFamily: "Fraunces, serif" }} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-3 gap-2">
        <Button size="sm" variant="ghost" onClick={() => { setDraft(core); setEditing(false); }}>Descartar</Button>
        <Button size="sm" disabled={update.isPending}
          onClick={() => update.mutate({ project_id: project.id, patch: draft }, { onSuccess: () => setEditing(false) })}>
          Salvar bússola
        </Button>
      </div>
    </Card>
  );
}
