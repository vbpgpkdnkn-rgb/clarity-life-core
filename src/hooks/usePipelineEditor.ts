import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ContentProject } from "./useContentProject";

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
      callAgent({
        mode: "refine",
        context: input.project.context,
        payload: { target_block: input.target_block, instruction: input.instruction },
      }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao refinar"),
  });

export const useAlternatives = () =>
  useMutation({
    mutationFn: async (input: AlternativesInput) =>
      callAgent({
        mode: "alternatives",
        context: input.project.context,
        payload: { target_block: input.target_block },
      }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao gerar alternativas"),
  });

export const useInlineCritique = () =>
  useMutation({
    mutationFn: async (input: CritiqueInput) =>
      callAgent({
        mode: "critique-inline",
        context: input.project.context,
        payload: { blocks: input.blocks },
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
      // 1. carregar stage
      const { data: stageRow, error: e1 } = await (supabase as any)
        .from("content_project_stages")
        .select("id, output")
        .eq("project_id", input.project_id)
        .eq("stage", input.stage)
        .maybeSingle();
      if (e1) throw e1;
      if (!stageRow) throw new Error("Etapa não encontrada");

      const out = stageRow.output ?? {};
      const arr: any[] = Array.isArray(out[input.key]) ? out[input.key] : [];
      const idx = arr.findIndex((b: any) => b.id === input.block_id);
      const before = idx >= 0 ? { ...arr[idx] } : null;
      if (idx >= 0) arr[idx] = { ...arr[idx], ...input.patch };
      const newOutput = { ...out, [input.key]: arr };

      const { error: e2 } = await (supabase as any)
        .from("content_project_stages")
        .update({ output: newOutput })
        .eq("id", stageRow.id);
      if (e2) throw e2;

      // 2. snapshot
      await (supabase as any).from("content_project_versions").insert({
        project_id: input.project_id,
        stage: input.stage,
        payload: newOutput,
        diff_from_previous: { block_id: input.block_id, before, after: arr[idx] ?? null },
        label: input.why ?? "edição",
      });

      // 3. evolution log no context
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
        before: before?.text ?? null,
        after: arr[idx]?.text ?? null,
        why: input.why ?? null,
        impact: input.impact ?? null,
        at: new Date().toISOString(),
      });
      await (supabase as any)
        .from("content_projects")
        .update({ context: { ...ctx, evolution: evolution.slice(0, 50) } })
        .eq("id", input.project_id);
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
      const { data: proj } = await (supabase as any)
        .from("content_projects")
        .select("context")
        .eq("id", input.project_id)
        .single();
      const ctx = proj?.context ?? {};
      const core = { ...(ctx.narrative_core ?? {}), ...input.patch };
      await (supabase as any)
        .from("content_projects")
        .update({ context: { ...ctx, narrative_core: core } })
        .eq("id", input.project_id);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["content_project", vars.project_id] });
    },
  });
};
