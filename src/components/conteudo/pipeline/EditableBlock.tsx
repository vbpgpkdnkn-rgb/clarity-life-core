import { useState } from "react";
import { Loader2, Wand2, Pencil, Check, X, Shuffle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useRefineBlock, useAlternatives, useApplyBlockEdit } from "@/hooks/usePipelineEditor";
import { estimateSeconds } from "@/lib/timing";
import type { ContentProject } from "@/hooks/useContentProject";

type Tone = "mais emocional" | "mais curto" | "mais provocativo" | "mais cinematográfico" | "mais simples";
const QUICK_TONES: Tone[] = ["mais emocional", "mais curto", "mais provocativo", "mais cinematográfico", "mais simples"];

interface BlockShape {
  id: string;
  role?: string;
  text?: string;
  main_idea?: string;
  micro_hook?: string;
  strong_phrase?: string;
  recording_note?: string;
  target_seconds?: number;
  emotional_goal?: string;
  tension?: string;
}

interface Props {
  project: ContentProject;
  stage: number;
  collectionKey: "blocks" | "topics" | "paragraphs";
  block: BlockShape;
  textField: keyof BlockShape; // qual campo é o "texto principal"
  index: number;
  annotations?: { type?: string; severity?: string; message?: string; suggestion?: string }[];
}

export function EditableBlock({ project, stage, collectionKey, block, textField, index, annotations = [] }: Props) {
  const apply = useApplyBlockEdit();
  const refine = useRefineBlock();
  const alts = useAlternatives();

  const currentText = (block[textField] as string) ?? "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentText);
  const [alternatives, setAlternatives] = useState<{ flavor: string; text: string; why?: string }[]>([]);
  const [customInstruction, setCustomInstruction] = useState("");

  const sec = estimateSeconds(currentText);

  const save = (newText: string, why?: string, impact?: string) => {
    apply.mutate(
      {
        project_id: project.id,
        stage,
        key: collectionKey,
        block_id: block.id,
        patch: { [textField as string]: newText },
        why,
        impact,
      },
      {
        onSuccess: () => {
          setEditing(false);
          setAlternatives([]);
          setDraft(newText);
        },
      },
    );
  };

  const doRefine = (instruction: string) => {
    refine.mutate(
      {
        project,
        stage,
        target_block: { id: block.id, role: block.role, text: currentText, target_seconds: block.target_seconds },
        instruction,
      },
      {
        onSuccess: (data: any) => {
          const newText = data?.block?.text;
          if (newText) save(newText, data?.why, data?.impact);
        },
      },
    );
  };

  const doAlternatives = () => {
    alts.mutate(
      { project, target_block: { id: block.id, role: block.role, text: currentText } },
      {
        onSuccess: (data: any) => setAlternatives(data?.alternatives ?? []),
      },
    );
  };

  return (
    <div className="border rounded-md p-3 space-y-2 bg-card">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="uppercase text-[10px]">{block.role ?? `Bloco ${index + 1}`}</Badge>
          {block.target_seconds && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {sec}s / alvo {block.target_seconds}s
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => { setDraft(currentText); setEditing(true); }}>
                <Pencil className="h-3 w-3 mr-1" /> Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={doAlternatives} disabled={alts.isPending}>
                {alts.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shuffle className="h-3 w-3 mr-1" />}
                Alternativas
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => save(draft, "edição manual")} disabled={apply.isPending}>
                <Check className="h-3 w-3 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(currentText); }}>
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} className="text-sm" />
      ) : (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{currentText}</p>
      )}

      {annotations.length > 0 && !editing && (
        <div className="space-y-2 border-l-2 border-destructive/40 bg-destructive/5 p-2">
          {annotations.map((a, i) => (
            <div key={i} className="text-xs space-y-1">
              <div className="flex items-center gap-2"><Badge variant={a.severity === "high" ? "destructive" : "secondary"} className="text-[9px]">{a.type ?? "revisão"}</Badge><span>{a.message}</span></div>
              {a.suggestion && <div className="rounded border bg-background p-2"><p className="text-muted-foreground line-through">{currentText}</p><p className="mt-1 font-medium">{a.suggestion}</p><Button size="sm" variant="outline" className="mt-2 h-6 text-[10px]" onClick={() => save(a.suggestion!, a.type ?? "revisão inline", a.message)}>Aceitar sugestão</Button></div>}
            </div>
          ))}
        </div>
      )}

      {/* outros campos do tópico (não-texto principal) só leitura compacta */}
      {block.main_idea && textField !== "main_idea" && (
        <p className="text-xs"><span className="text-muted-foreground">Ideia:</span> {block.main_idea}</p>
      )}
      {block.micro_hook && textField !== "micro_hook" && (
        <p className="text-xs"><span className="text-muted-foreground">Micro-hook:</span> "{block.micro_hook}"</p>
      )}
      {block.strong_phrase && textField !== "strong_phrase" && (
        <p className="text-xs italic">"{block.strong_phrase}"</p>
      )}
      {block.recording_note && (
        <p className="text-[11px] text-muted-foreground border-t pt-1">Gravação: {block.recording_note}</p>
      )}
      {block.tension && (
        <p className="text-[11px] italic text-muted-foreground">Tensão: {block.tension}</p>
      )}

      {/* refinamento por tom */}
      {!editing && (
        <div className="flex flex-wrap gap-1 pt-1 border-t">
          {QUICK_TONES.map((t) => (
            <Button
              key={t}
              size="sm"
              variant="secondary"
              className="h-6 text-[10px]"
              disabled={refine.isPending || apply.isPending}
              onClick={() => doRefine(t)}
            >
              {refine.isPending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Wand2 className="h-2.5 w-2.5 mr-1" />}
              {t}
            </Button>
          ))}
          <div className="flex items-center gap-1 w-full mt-1">
            <input
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="instrução livre (ex.: começar com pergunta)"
              className="flex-1 h-6 text-[11px] px-2 rounded border bg-background"
            />
            <Button
              size="sm"
              className="h-6 text-[10px]"
              disabled={!customInstruction.trim() || refine.isPending}
              onClick={() => { doRefine(customInstruction); setCustomInstruction(""); }}
            >
              Refinar
            </Button>
          </div>
        </div>
      )}

      {/* alternativas */}
      {alternatives.length > 0 && (
        <div className="pt-2 border-t space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Alternativas — clique para aplicar
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {alternatives.map((a, i) => (
              <button
                key={i}
                onClick={() => save(a.text, a.flavor, a.why)}
                className="text-left border rounded p-2 hover:border-primary hover:bg-primary/5 transition"
              >
                <Badge variant="outline" className="text-[9px] mb-1">{a.flavor}</Badge>
                <p className="text-xs">{a.text}</p>
                {a.why && <p className="text-[10px] text-muted-foreground italic mt-1">{a.why}</p>}
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setAlternatives([])} className="text-[10px]">
            descartar alternativas
          </Button>
        </div>
      )}
    </div>
  );
}
