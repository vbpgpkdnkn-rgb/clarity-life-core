/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Loader2, Wand2, Pencil, Check, X, Shuffle, Clock, AlertTriangle, Lightbulb, Target, Sparkles, Copy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRefineBlock, useAlternatives, useApplyBlockEdit, copyToClipboard } from "@/hooks/usePipelineEditor";
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
  last_rationale?: string;
}

interface Annotation {
  type?: string;
  severity?: string;
  message?: string;
  problem?: string;
  reason?: string;
  impact?: string;
  suggestion?: string;
  suggested_text?: string;
  excerpt?: string;
}

interface Props {
  project: ContentProject;
  stage: number;
  collectionKey: "blocks" | "topics" | "paragraphs";
  block: BlockShape;
  textField: keyof BlockShape;
  index: number;
  annotations?: Annotation[];
  onAdvance?: () => void;
}

function annotationStyle(type?: string, severity?: string) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("hook") || t.includes("retenção") || t.includes("retencao") || severity === "high") {
    return { Icon: AlertTriangle, label: "Risco de retenção", tone: "danger" as const };
  }
  if (t.includes("cta") || t.includes("conex")) {
    return { Icon: Target, label: "Oportunidade estratégica", tone: "accent" as const };
  }
  return { Icon: Lightbulb, label: "Insight criativo", tone: "info" as const };
}

const toneClasses = {
  danger: "border-l-destructive/60 bg-destructive/[0.03]",
  accent: "border-l-accent/60 bg-accent/[0.04]",
  info: "border-l-primary/40 bg-primary/[0.03]",
};

export function EditableBlock({ project, stage, collectionKey, block, textField, index, annotations = [], onAdvance }: Props) {
  const apply = useApplyBlockEdit();
  const refine = useRefineBlock();
  const alts = useAlternatives();

  const currentText = (block[textField] as string) ?? "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentText);
  const [alternatives, setAlternatives] = useState<{ flavor: string; text: string; why?: string }[]>([]);
  const [customInstruction, setCustomInstruction] = useState("");
  const [showTones, setShowTones] = useState(false);
  const [justChanged, setJustChanged] = useState(false);
  const [comparing, setComparing] = useState<string | null>(null);

  const sec = estimateSeconds(currentText);
  const isPending = refine.isPending || apply.isPending || alts.isPending;

  const save = (newText: string, why?: string, impact?: string, opts: { capture_signature?: boolean; advance?: boolean } = {}) => {
    apply.mutate(
      {
        project_id: project.id, stage, key: collectionKey, block_id: block.id,
        patch: { [textField as string]: newText, last_rationale: why ? `${why}${impact ? ` — ${impact}` : ""}` : undefined },
        why, impact,
        capture_signature: opts.capture_signature,
      },
      {
        onSuccess: () => {
          setEditing(false);
          setAlternatives([]);
          setDraft(newText);
          setJustChanged(true);
          setTimeout(() => setJustChanged(false), 2200);
          if (opts.advance) onAdvance?.();
        },
      },
    );
  };

  const doRefine = (instruction: string) => {
    refine.mutate(
      {
        project, stage,
        target_block: { id: block.id, role: block.role, text: currentText, target_seconds: block.target_seconds },
        instruction,
      },
      {
        onSuccess: (data: any) => {
          const newText = data?.block?.text;
          if (newText) save(newText, data?.why ?? instruction, data?.impact);
        },
      },
    );
  };

  const doAlternatives = () => {
    alts.mutate(
      { project, target_block: { id: block.id, role: block.role, text: currentText } },
      { onSuccess: (data: any) => setAlternatives(data?.alternatives ?? []) },
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={`group relative border rounded-lg p-4 bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-soft)] ${
          justChanged ? "ring-1 ring-accent/40 animate-fade-in" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{block.role ?? `Bloco ${index + 1}`}</span>
            {block.target_seconds && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`text-[10px] flex items-center gap-1 ${
                    sec > block.target_seconds * 1.3 ? "text-destructive" : sec > block.target_seconds ? "text-warning" : "text-muted-foreground"
                  }`}>
                    <Clock className="h-2.5 w-2.5" /> {sec}s / {block.target_seconds}s
                  </span>
                </TooltipTrigger>
                <TooltipContent>Tempo estimado vs. alvo</TooltipContent>
              </Tooltip>
            )}
            {isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {!editing ? (
              <>
                <Tooltip><TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyToClipboard(currentText)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger><TooltipContent>Copiar</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setDraft(currentText); setEditing(true); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={doAlternatives} disabled={isPending}>
                    <Shuffle className="h-3 w-3" />
                  </Button>
                </TooltipTrigger><TooltipContent>Alternativas</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowTones((v) => !v)}>
                    <Wand2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger><TooltipContent>Refinar por tom</TooltipContent></Tooltip>
              </>
            ) : (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditing(false); setDraft(currentText); }}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {editing ? (
          <>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} autoFocus
              className="text-base leading-relaxed border-accent/30 focus-visible:ring-accent/30"
              style={{ fontFamily: "Fraunces, serif" }} />
            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/60">
              <Button size="sm" className="h-7 text-[11px]" disabled={isPending} onClick={() => save(draft, "edição manual", undefined, { capture_signature: true })}>
                <Check className="h-3 w-3 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => copyToClipboard(draft)}>
                <Copy className="h-3 w-3 mr-1" /> Copiar
              </Button>
              {onAdvance && (
                <Button size="sm" variant="secondary" className="h-7 text-[11px]" disabled={isPending}
                  onClick={() => save(draft, "edição manual", undefined, { capture_signature: true, advance: true })}>
                  <ArrowRight className="h-3 w-3 mr-1" /> Salvar e avançar
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => { setEditing(false); setDraft(currentText); }}>
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground" style={{ fontFamily: "Fraunces, serif" }}>
            {currentText || <span className="text-muted-foreground italic text-sm" style={{ fontFamily: "inherit" }}>vazio — refine ou edite</span>}
          </p>
        )}

        {block.last_rationale && !editing && (
          <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground italic animate-fade-in">
            <Sparkles className="h-3 w-3 text-accent shrink-0 mt-0.5" />
            <span>{block.last_rationale}</span>
          </div>
        )}

        {/* Anotações aplicáveis */}
        {annotations.length > 0 && !editing && (
          <div className="mt-3 space-y-2">
            {annotations.map((a, i) => {
              const { Icon, label, tone } = annotationStyle(a.type, a.severity);
              const suggestion = a.suggested_text ?? a.suggestion;
              return (
                <div key={i} className={`border-l-2 pl-3 py-1.5 ${toneClasses[tone]}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`h-3 w-3 ${tone === "danger" ? "text-destructive" : tone === "accent" ? "text-accent" : "text-primary"}`} />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                  </div>
                  {a.problem && <p className="text-xs font-medium text-foreground/90">⚠ {a.problem}</p>}
                  {!a.problem && a.message && <p className="text-xs text-foreground/80">{a.message}</p>}
                  {a.reason && <p className="text-[11px] text-muted-foreground mt-0.5"><span className="opacity-70">motivo · </span>{a.reason}</p>}
                  {a.impact && <p className="text-[11px] text-muted-foreground"><span className="opacity-70">impacto · </span>{a.impact}</p>}
                  {suggestion && (
                    <div className="mt-2 rounded border border-border/60 bg-background/60 p-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">💡 sugestão</p>
                      <p className="text-sm" style={{ fontFamily: "Fraunces, serif" }}>{suggestion}</p>
                      {comparing === suggestion && (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                          <div className="border rounded p-2 bg-muted/30">
                            <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">atual</p>
                            <p style={{ fontFamily: "Fraunces, serif" }}>{currentText}</p>
                          </div>
                          <div className="border rounded p-2 bg-accent/5">
                            <p className="text-[9px] uppercase tracking-wider text-accent mb-1">proposto</p>
                            <p style={{ fontFamily: "Fraunces, serif" }}>{suggestion}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Button size="sm" className="h-6 text-[10px]" onClick={() => save(suggestion, a.problem ?? label, a.impact)}>
                          Aplicar alteração
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { setDraft(suggestion); setEditing(true); }}>
                          Editar manualmente
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setComparing(comparing === suggestion ? null : suggestion)}>
                          {comparing === suggestion ? "Fechar" : "Comparar versões"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(block.main_idea && textField !== "main_idea") || (block.micro_hook && textField !== "micro_hook") || block.tension || block.recording_note ? (
          <div className="mt-3 pt-2 border-t border-border/60 space-y-0.5 text-[11px] text-muted-foreground">
            {block.main_idea && textField !== "main_idea" && <p><span className="opacity-60">ideia · </span>{block.main_idea}</p>}
            {block.micro_hook && textField !== "micro_hook" && <p><span className="opacity-60">micro-hook · </span>"{block.micro_hook}"</p>}
            {block.tension && <p className="italic"><span className="opacity-60 not-italic">tensão · </span>{block.tension}</p>}
            {block.recording_note && <p><span className="opacity-60">gravação · </span>{block.recording_note}</p>}
          </div>
        ) : null}

        {showTones && !editing && (
          <div className="mt-3 pt-3 border-t border-border/60 space-y-2 animate-fade-in">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Refinar por tom</p>
            <div className="flex flex-wrap gap-1">
              {QUICK_TONES.map((t) => (
                <Button key={t} size="sm" variant="secondary" className="h-6 text-[10px] rounded-full" disabled={isPending} onClick={() => doRefine(t)}>
                  {t}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <input value={customInstruction} onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="instrução livre"
                className="flex-1 h-7 text-[11px] px-2 rounded-md border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/30"
                onKeyDown={(e) => { if (e.key === "Enter" && customInstruction.trim()) { doRefine(customInstruction); setCustomInstruction(""); } }} />
              <Button size="sm" className="h-7 text-[10px]" disabled={!customInstruction.trim() || isPending}
                onClick={() => { doRefine(customInstruction); setCustomInstruction(""); }}>Refinar</Button>
            </div>
          </div>
        )}

        {alternatives.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/60 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Alternativas — clique para aplicar</p>
              <Button size="sm" variant="ghost" onClick={() => setAlternatives([])} className="h-6 text-[10px]">descartar</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {alternatives.map((a, i) => (
                <button key={i} onClick={() => save(a.text, a.flavor, a.why)}
                  className="text-left border rounded-md p-3 hover:border-accent hover:bg-accent/5 hover:shadow-[var(--shadow-soft)] transition-all">
                  <span className="text-[9px] uppercase tracking-wider text-accent">{a.flavor}</span>
                  <p className="text-sm mt-1" style={{ fontFamily: "Fraunces, serif" }}>{a.text}</p>
                  {a.why && <p className="text-[10px] text-muted-foreground italic mt-2">↳ {a.why}</p>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
