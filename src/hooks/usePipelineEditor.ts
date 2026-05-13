import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ContentProject } from "./useContentProject";
import { enqueueAction } from "@/lib/contentProjectQueue";

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
        operation: `generate alternatives ${input.target_block.id ?? ""}`,
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

// Atualiza um único bloco dentro do output de um stage e registra evolution
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
          await (supabase as any)
            .from("content_projects")
            .update({ context: { ...ctx, evolution: evolution.slice(0, 80) } })
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

export const useUpdateNarrativeCore = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string; patch: Record<string, any> }) => {
      return enqueueAction({
        projectId: input.project_id,
        operation: "patch narrative core",
        run: async () => {
          const { data: proj } = await (supabase as any)
            .from("content_projects")
            .select("context")
            .eq("id", input.project_id)
            .single();
          const ctx = proj?.context ?? {};
          const core = { ...(ctx.narrative_core ?? {}), ...input.patch };
          const evolution = Array.isArray(ctx.evolution) ? ctx.evolution : [];
          evolution.unshift({
            stage: "core",
            field: "narrative_core",
            why: "Núcleo narrativo atualizado",
            impact: "As próximas decisões da IA herdam esta direção.",
            at: new Date().toISOString(),
          });
          await (supabase as any)
            .from("content_projects")
            .update({ context: { ...ctx, narrative_core: core, evolution: evolution.slice(0, 80) } })
            .eq("id", input.project_id);
        },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["content_project", vars.project_id] });
    },
  });
};
