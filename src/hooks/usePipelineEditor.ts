/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ContentProject } from "./useContentProject";
import { enqueueAction } from "@/lib/contentProjectQueue";
import { buildSignatureSample, mergeAuthorSignature } from "@/lib/compass";

interface RefineInput {
  project: ContentProject;
  stage: number;
  target_block: { id?: string; role?: string; text: string; target_seconds?: number };
  instruction: string;
}
interface AlternativesInput {
  project: ContentProject;
  target_block: { id?: string; role?: string; text: string };
}
interface CritiqueInput {
  project: ContentProject;
  blocks: { id: string; role?: string; text: string }[];
}

async function callAgent(body: any) {
  const { data, error } = await supabase.functions.invoke("content-pipeline-agent", { body });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

export const useRefineBlock = () =>
  useMutation({
    mutationFn: async (input: RefineInput) =>
      enqueueAction({
        projectId: input.project.id,
        operation: `refine block ${input.target_block.id ?? ""}`,
        run: () => callAgent({
          mode: "refine",
          context: input.project.context,
          payload: { target_block: input.target_block, instruction: input.instruction },
        }),
      }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao refinar"),
  });

export const useAlternatives = () =>
  useMutation({
    mutationFn: async (input: AlternativesInput) =>
      enqueueAction({
        projectId: input.project.id,
        operation: `alts ${input.target_block.id ?? ""}`,
        run: () => callAgent({
          mode: "alternatives",
          context: input.project.context,
          payload: { target_block: input.target_block },
        }),
      }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao gerar alternativas"),
  });

export const useInlineCritique = () =>
  useMutation({
    mutationFn: async (input: CritiqueInput) =>
      enqueueAction({
        projectId: input.project.id,
        operation: "critique inline",
        run: () => callAgent({
          mode: "critique-inline",
          context: input.project.context,
          payload: { blocks: input.blocks },
        }),
      }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao analisar"),
  });

// Atualiza um bloco e captura assinatura autoral em edições manuais
export const useApplyBlockEdit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      stage: number;
      key: "blocks" | "topics" | "paragraphs";
      block_id: string;
      patch: Record<string, any>;
      why?: string;
      impact?: string;
      capture_signature?: boolean;
    }) => {
      return enqueueAction({
        projectId: input.project_id,
        operation: `patch block ${input.block_id}`,
        run: async () => {
          const { data: stageRow, error: e1 } = await (supabase as any)
            .from("content_project_stages")
            .select("id, output")
            .eq("project_id", input.project_id)
            .eq("stage", input.stage)
            .maybeSingle();
          if (e1) throw e1;
          if (!stageRow) throw new Error("Etapa não encontrada");

          const out = stageRow.output ?? {};
          const arr: any[] = Array.isArray(out[input.key]) ? [...out[input.key]] : [];
          const idx = arr.findIndex((b: any) => b.id === input.block_id);
          const before = idx >= 0 ? { ...arr[idx] } : null;
          if (idx < 0) throw new Error("Bloco não encontrado");
          arr[idx] = { ...arr[idx], ...input.patch, updated_at: new Date().toISOString() };
          const newOutput = { ...out, [input.key]: arr };

          const { error: e2 } = await (supabase as any)
            .from("content_project_stages")
            .update({ output: newOutput })
            .eq("id", stageRow.id);
          if (e2) throw e2;

          await (supabase as any).from("content_project_versions").insert({
            project_id: input.project_id,
            stage: input.stage,
            payload: { [input.key]: [arr[idx]] },
            diff_from_previous: { type: "block_patch", block_id: input.block_id, before, after: arr[idx] },
            label: input.why ?? "edição incremental",
          });

          const { data: proj } = await (supabase as any)
            .from("content_projects")
            .select("context")
            .eq("id", input.project_id)
            .single();
          const ctx = proj?.context ?? {};
          const evolution = Array.isArray(ctx.evolution) ? ctx.evolution : [];
          evolution.unshift({
            stage: input.stage,
            field: input.block_id,
            before: before?.text ?? before?.main_idea ?? before?.strong_phrase ?? null,
            after: arr[idx]?.text ?? arr[idx]?.main_idea ?? arr[idx]?.strong_phrase ?? null,
            why: input.why ?? null,
            impact: input.impact ?? null,
            at: new Date().toISOString(),
          });

          // Captura assinatura autoral em edições manuais
          let compass = ctx.compass ?? {};
          if (input.capture_signature) {
            const newText = arr[idx]?.text ?? arr[idx]?.main_idea ?? arr[idx]?.strong_phrase ?? "";
            if (newText && newText.length > 20) {
              const sample = buildSignatureSample(newText, arr[idx]?.role);
              compass = { ...compass, author_signature: mergeAuthorSignature(compass.author_signature, sample) };
            }
          }

          await (supabase as any)
            .from("content_projects")
            .update({ context: { ...ctx, compass, evolution: evolution.slice(0, 80) } })
            .eq("id", input.project_id);
        },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["content_project_stages", vars.project_id] });
      qc.invalidateQueries({ queryKey: ["content_project_versions", vars.project_id] });
      qc.invalidateQueries({ queryKey: ["content_project", vars.project_id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao aplicar edição"),
  });
};

// Atualiza a bússola unificada (compass) — substitui useUpdateNarrativeCore
export const useUpdateCompass = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string; patch: Record<string, any> }) => {
      return enqueueAction({
        projectId: input.project_id,
        operation: "update compass",
        run: async () => {
          const { data: proj } = await (supabase as any)
            .from("content_projects")
            .select("context")
            .eq("id", input.project_id)
            .single();
          const ctx = proj?.context ?? {};
          const compass = { ...(ctx.compass ?? {}), ...input.patch };
          const evolution = Array.isArray(ctx.evolution) ? ctx.evolution : [];
          evolution.unshift({
            stage: "compass",
            field: "bússola",
            why: "Bússola atualizada",
            impact: "Toda a esteira herda esta direção.",
            at: new Date().toISOString(),
          });
          await (supabase as any)
            .from("content_projects")
            .update({ context: { ...ctx, compass, narrative_core: { ...(ctx.narrative_core ?? {}), ...input.patch }, evolution: evolution.slice(0, 80) } })
            .eq("id", input.project_id);
        },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["content_project", vars.project_id] });
    },
  });
};

// Compatibilidade legada
export const useUpdateNarrativeCore = useUpdateCompass;

// Gera o master_prompt (DNA) a partir do contexto atual
export const useGenerateMasterPrompt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (project: ContentProject) =>
      enqueueAction({
        projectId: project.id,
        operation: "compass-master",
        run: async () => {
          const data = await callAgent({ mode: "compass-master", context: project.context, payload: {} });
          const master = data?.master_prompt ?? "";
          if (!master) throw new Error("IA não devolveu master_prompt");
          const { data: proj } = await (supabase as any)
            .from("content_projects")
            .select("context").eq("id", project.id).single();
          const ctx = proj?.context ?? {};
          const compass = { ...(ctx.compass ?? {}), master_prompt: master };
          await (supabase as any)
            .from("content_projects")
            .update({ context: { ...ctx, compass } })
            .eq("id", project.id);
          return data;
        },
      }),
    onSuccess: (_d, project) => {
      qc.invalidateQueries({ queryKey: ["content_project", project.id] });
      toast.success("Master prompt gerado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao gerar master prompt"),
  });
};

// Finaliza projeto e envia para o pipeline (cria content_pieces)
export const useFinalizeProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project: ContentProject; paragraphs: any[] }) =>
      enqueueAction({
        projectId: input.project.id,
        operation: "finalize project",
        run: async () => {
          const ps = input.paragraphs ?? [];
          const hook = ps.find((p) => p.role?.includes("hook"))?.text ?? ps[0]?.text ?? "";
          const cta = ps.find((p) => p.role?.includes("cta"))?.text ?? ps[ps.length - 1]?.text ?? "";
          const script = ps.map((p) => p.text).filter(Boolean).join("\n\n");

          const { data: piece, error: ePiece } = await (supabase as any)
            .from("content_pieces")
            .insert({
              title: input.project.title,
              hook,
              cta,
              script,
              status: "roteiro_pronto",
              pipeline_stage: "roteiro_pronto",
              scope: input.project.scope ?? "profissional",
            })
            .select().single();
          if (ePiece) throw ePiece;

          const { data: proj } = await (supabase as any)
            .from("content_projects")
            .select("context").eq("id", input.project.id).single();
          const ctx = proj?.context ?? {};
          const compass = ctx.compass ?? {};
          const history = Array.isArray(compass.refinement_history) ? compass.refinement_history : [];
          history.unshift({ at: new Date().toISOString(), what: "finalizado e enviado para pipeline", why: "esteira concluída" });

          await (supabase as any)
            .from("content_projects")
            .update({
              status: "concluido",
              linked_piece_id: piece.id,
              context: { ...ctx, compass: { ...compass, refinement_history: history.slice(0, 50) } },
            })
            .eq("id", input.project.id);

          return piece;
        },
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["content_project", vars.project.id] });
      qc.invalidateQueries({ queryKey: ["content_projects"] });
      qc.invalidateQueries({ queryKey: ["content_pieces"] });
      toast.success("Conteúdo enviado para o pipeline");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao finalizar"),
  });
};

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copiado");
  } catch {
    toast.error("Não foi possível copiar");
  }
}
