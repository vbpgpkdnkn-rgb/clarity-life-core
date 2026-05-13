/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Sparkles, Edit3, X, Compass, Loader2, Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUpdateCompass, useGenerateMasterPrompt } from "@/hooks/usePipelineEditor";
import { getCompass } from "@/lib/compass";
import type { ContentProject } from "@/hooks/useContentProject";

type FieldDef = { key: string; label: string; hint: string; long?: boolean; group: "narrativa" | "audiência" | "forma" | "estilo" };

const FIELDS: FieldDef[] = [
  { key: "central_idea", label: "Ideia central", hint: "A única frase que resume o conteúdo.", group: "narrativa" },
  { key: "intent", label: "Intenção", hint: "Por que precisa existir?", group: "narrativa" },
  { key: "promise", label: "Promessa", hint: "O que o espectador leva embora?", group: "narrativa" },
  { key: "emotional_tension", label: "Tensão emocional", hint: "Que conflito mantém atenção?", long: true, group: "narrativa" },
  { key: "strategic_goal", label: "Objetivo estratégico", hint: "Qual o resultado de negócio/posicionamento?", group: "narrativa" },
  { key: "tone", label: "Tom", hint: "Temperatura emocional.", group: "narrativa" },

  { key: "audience", label: "Audiência", hint: "Para quem você fala?", group: "audiência" },
  { key: "pains", label: "Dores", hint: "Liste separadas por ;", group: "audiência" },
  { key: "desires", label: "Desejos", hint: "Liste separadas por ;", group: "audiência" },

  { key: "format", label: "Formato", hint: "Reels, carrossel, vídeo longo…", group: "forma" },
  { key: "duration_seconds", label: "Duração (s)", hint: "Alvo total em segundos.", group: "forma" },
  { key: "density", label: "Densidade", hint: "leve | medio | denso", group: "forma" },
  { key: "rhythm", label: "Ritmo", hint: "Pausas, velocidade, respiração.", group: "forma" },
  { key: "cta", label: "CTA", hint: "Ação final desejada.", group: "forma" },

  { key: "narrative_style", label: "Estilo narrativo", hint: "Storytelling, ensaio, didático…", group: "estilo" },
  { key: "writing_pattern", label: "Padrão de escrita", hint: "Como você costuma escrever.", long: true, group: "estilo" },
  { key: "examples", label: "Exemplos", hint: "Casos/imagens recorrentes (; separa).", group: "estilo" },
  { key: "references", label: "Referências", hint: "Autores, estilos (; separa).", group: "estilo" },
];

function toListString(v: any): string {
  if (Array.isArray(v)) return v.join("; ");
  return v ?? "";
}
function fromListString(s: string): string[] {
  return s.split(";").map((x) => x.trim()).filter(Boolean);
}

export function NarrativeCorePanel({ project }: { project: ContentProject }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateCompass();
  const genMaster = useGenerateMasterPrompt();
  const compass = getCompass(project) as Record<string, any>;
  const [draft, setDraft] = useState<Record<string, any>>(compass);
  useEffect(() => { setDraft(compass); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id]);

  const filled = FIELDS.filter((f) => {
    const v = compass[f.key];
    return Array.isArray(v) ? v.length : (v ?? "").toString().trim();
  });
  const hasMaster = !!compass.master_prompt;

  if (!editing) {
    return (
      <TooltipProvider delayDuration={200}>
        <Card className="px-3 py-2 border-primary/20 bg-gradient-to-r from-accent/5 via-transparent to-transparent flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 shrink-0">
            <Compass className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Bússola · memória viva</span>
            {hasMaster && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Brain className="h-3 w-3 text-accent" />
                </TooltipTrigger>
                <TooltipContent className="max-w-md">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Master prompt (DNA)</p>
                  <p className="text-xs whitespace-pre-wrap">{compass.master_prompt}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 flex-1 min-w-0">
            {filled.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Defina a bússola para ancorar todas as decisões da IA.</span>
            ) : (
              filled.slice(0, 8).map((f) => (
                <Tooltip key={f.key}>
                  <TooltipTrigger asChild>
                    <div className="flex items-baseline gap-1.5 min-w-0 max-w-[220px]">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">{f.label}</span>
                      <span className="text-xs font-medium truncate" style={{ fontFamily: "Fraunces, serif" }}>
                        {toListString(compass[f.key])}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{f.label}</p>
                    <p className="text-sm" style={{ fontFamily: "Fraunces, serif" }}>{toListString(compass[f.key])}</p>
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

  const groups: { name: string; fields: FieldDef[] }[] = [
    { name: "Narrativa", fields: FIELDS.filter((f) => f.group === "narrativa") },
    { name: "Audiência", fields: FIELDS.filter((f) => f.group === "audiência") },
    { name: "Forma", fields: FIELDS.filter((f) => f.group === "forma") },
    { name: "Estilo", fields: FIELDS.filter((f) => f.group === "estilo") },
  ];

  return (
    <Card className="p-4 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold">Bússola do projeto</h3>
          <span className="text-[10px] text-muted-foreground italic">a IA herda toda essa memória</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7"><X className="h-3.5 w-3.5" /></Button>
      </div>

      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.name}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{g.name}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {g.fields.map((f) => {
                const isList = ["pains", "desires", "examples", "references"].includes(f.key);
                const value = isList ? toListString(draft[f.key]) : (draft[f.key] ?? "");
                const onChange = (v: string) => setDraft((d) => ({ ...d, [f.key]: isList ? fromListString(v) : (f.key === "duration_seconds" ? Number(v) || 0 : v) }));
                return (
                  <div key={f.key} className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</label>
                    {f.long ? (
                      <Textarea rows={2} placeholder={f.hint} value={value} onChange={(e) => onChange(e.target.value)} className="text-sm" style={{ fontFamily: "Fraunces, serif" }} />
                    ) : (
                      <Input placeholder={f.hint} value={value} onChange={(e) => onChange(e.target.value)} className="text-sm" style={{ fontFamily: "Fraunces, serif" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Brain className="h-3 w-3" /> Master prompt (DNA)</label>
            <Button size="sm" variant="outline" className="h-6 text-[10px]" disabled={genMaster.isPending} onClick={() => genMaster.mutate(project)}>
              {genMaster.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Gerar pela IA
            </Button>
          </div>
          <Textarea
            rows={5}
            placeholder="Texto denso que vira o DNA do conteúdo — herdado por toda geração futura."
            value={draft.master_prompt ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, master_prompt: e.target.value }))}
            className="text-sm" style={{ fontFamily: "Fraunces, serif" }}
          />
        </div>
      </div>

      <div className="flex justify-end mt-3 gap-2">
        <Button size="sm" variant="ghost" onClick={() => { setDraft(compass); setEditing(false); }}>Descartar</Button>
        <Button size="sm" disabled={update.isPending}
          onClick={() => update.mutate({ project_id: project.id, patch: draft }, { onSuccess: () => setEditing(false) })}>
          Salvar bússola
        </Button>
      </div>
    </Card>
  );
}
