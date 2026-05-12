import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUpdateNarrativeCore } from "@/hooks/usePipelineEditor";
import type { ContentProject } from "@/hooks/useContentProject";

const FIELDS: { key: string; label: string; long?: boolean }[] = [
  { key: "intent", label: "Intenção" },
  { key: "promise", label: "Promessa" },
  { key: "tension", label: "Tensão central", long: true },
  { key: "positioning", label: "Posicionamento" },
  { key: "tone", label: "Tom" },
  { key: "emotional_goal", label: "Objetivo emocional" },
];

export function NarrativeCorePanel({ project }: { project: ContentProject }) {
  const [open, setOpen] = useState(false);
  const update = useUpdateNarrativeCore();
  const core = (project.context as any)?.narrative_core ?? {};
  const [draft, setDraft] = useState<Record<string, string>>(core);

  const filled = FIELDS.filter((f) => (core[f.key] ?? "").toString().trim()).length;

  return (
    <Card className="p-3 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider">Núcleo narrativo</span>
          <span className="text-[10px] text-muted-foreground truncate">
            {filled}/{FIELDS.length} preenchidos
            {core.intent ? ` · ${String(core.intent).slice(0, 60)}` : ""}
          </span>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {FIELDS.map((f) =>
            f.long ? (
              <Textarea
                key={f.key}
                rows={2}
                placeholder={f.label}
                value={draft[f.key] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                className="text-xs"
              />
            ) : (
              <Input
                key={f.key}
                placeholder={f.label}
                value={draft[f.key] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                className="text-xs"
              />
            ),
          )}
          <div className="md:col-span-2 flex justify-end">
            <Button
              size="sm"
              disabled={update.isPending}
              onClick={() => update.mutate({ project_id: project.id, patch: draft })}
            >
              Salvar núcleo
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
