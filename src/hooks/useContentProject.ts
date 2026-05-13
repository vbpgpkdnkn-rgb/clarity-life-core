import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { enqueueAction } from "@/lib/contentProjectQueue";

export const STAGE_LABELS = [
  "Ideia",
  "Audiência",
  "Refinamento",
  "Estrutura",
  "Tópicos",
  "Roteiro",
  "Crítica",
  "Gravação",
  "Edição",
  "Postagem",
  "Calendário",
  "Pipeline",
];

export interface ContentProjectContext {
  intent: string;
  angle: string;
  tone: string;
  positioning: string;
  audience: {
    pains: string[];
    desires: string[];
    objections: string[];
    emotional_patterns: string[];
  };
  approved_assets: {
    hooks: string[];
    metaphors: string[];
    examples: string[];
    phrases: string[];
  };
  rejected: { hooks: string[]; directions: string[] };
  narrative: { arc: string; tension_points: string[]; cta_type: string };
  timing: { target_seconds: number; density: string };
}

export interface ContentProject {
  id: string;
  title: string;
  intent: string | null;
  scope: string;
  current_stage: number;
  status: string;
  context: ContentProjectContext;
  source_idea_id: string | null;
  linked_piece_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentProjectStage {
  id: string;
  project_id: string;
  stage: number;
  status: "pending" | "active" | "done" | "skipped";
  input: any;
  output: any;
  ai_reasoning: string | null;
  user_decisions: any;
  created_at: string;
  updated_at: string;
}

export interface ContentProjectVersion {
  id: string;
  project_id: string;
  stage: number;
  payload: any;
  diff_from_previous: any;
  label: string | null;
  created_at: string;
}

async function appendEvolution(projectId: string, entry: Record<string, any>) {
  const { data: proj } = await (supabase as any)
    .from("content_projects")
    .select("context")
    .eq("id", projectId)
    .single();
  const ctx = proj?.context ?? {};
  const evolution = Array.isArray(ctx.evolution) ? ctx.evolution : [];
  evolution.unshift({ ...entry, at: new Date().toISOString() });
  await (supabase as any)
    .from("content_projects")
    .update({ context: { ...ctx, evolution: evolution.slice(0, 80) } })
    .eq("id", projectId);
}

async function patchProjectContextRaw(id: string, patch: Partial<ContentProjectContext>, current_stage?: number) {
  const { data: current, error: e1 } = await (supabase as any)
    .from("content_projects")
    .select("context")
    .eq("id", id)
    .single();
  if (e1) throw e1;
  const merged = { ...(current?.context ?? {}), ...patch };
  const upd: any = { context: merged };
  if (current_stage) upd.current_stage = current_stage;
  const { error } = await (supabase as any).from("content_projects").update(upd).eq("id", id);
  if (error) throw error;
}

async function saveStageOutputRaw(input: {
  project_id: string;
  stage: number;
  output: any;
  ai_reasoning?: string;
  label?: string;
  mark_done?: boolean;
}) {
  const { data: existing } = await (supabase as any)
    .from("content_project_stages")
    .select("id, output")
    .eq("project_id", input.project_id)
    .eq("stage", input.stage)
    .maybeSingle();

  const mergedOutput = existing?.id ? { ...(existing.output ?? {}), ...(input.output ?? {}) } : input.output;
  if (existing?.id) {
    const { error } = await (supabase as any)
      .from("content_project_stages")
      .update({ output: mergedOutput, ai_reasoning: input.ai_reasoning ?? null, status: input.mark_done ? "done" : "active" })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await (supabase as any).from("content_project_stages").insert({
      project_id: input.project_id,
      stage: input.stage,
      status: input.mark_done ? "done" : "active",
      output: input.output,
      ai_reasoning: input.ai_reasoning ?? null,
    });
    if (error) throw error;
  }

  await (supabase as any).from("content_project_versions").insert({
    project_id: input.project_id,
    stage: input.stage,
    payload: mergedOutput,
    diff_from_previous: { type: "stage_snapshot", stage: input.stage },
    label: input.label ?? null,
  });

  if (input.mark_done) {
    await (supabase as any)
      .from("content_projects")
      .update({ current_stage: Math.max(input.stage + 1, 1) })
      .eq("id", input.project_id);
  }
}

export const useContentProjects = () =>
  useQuery({
    queryKey: ["content_projects"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("content_projects")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContentProject[];
    },
  });

export const useContentProject = (id?: string | null) =>
  useQuery({
    queryKey: ["content_project", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("content_projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as ContentProject | null;
    },
  });

export const useProjectStages = (projectId?: string | null) =>
  useQuery({
    queryKey: ["content_project_stages", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("content_project_stages")
        .select("*")
        .eq("project_id", projectId)
        .order("stage", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContentProjectStage[];
    },
  });

export const useProjectVersions = (projectId?: string | null) =>
  useQuery({
    queryKey: ["content_project_versions", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("content_project_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContentProjectVersion[];
    },
  });

export const useCreateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; intent?: string; scope?: string; source_idea_id?: string }) => {
      const payload: any = {
        title: input.title,
        intent: input.intent ?? null,
        scope: input.scope ?? "profissional",
        source_idea_id: input.source_idea_id ?? null,
      };
      const { data, error } = await (supabase as any)
        .from("content_projects")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as ContentProject;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_projects"] });
      toast.success("Projeto de conteúdo criado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar projeto"),
  });
};

export const useUpdateProjectContext = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<ContentProjectContext>; current_stage?: number }) => {
      return enqueueAction({
        projectId: input.id,
        operation: "patch narrative/context",
        run: async () => {
          const { data: current, error: e1 } = await (supabase as any)
            .from("content_projects")
            .select("context")
            .eq("id", input.id)
            .single();
          if (e1) throw e1;
          const merged = { ...(current?.context ?? {}), ...input.patch };
          const upd: any = { context: merged };
          if (input.current_stage) upd.current_stage = input.current_stage;
          const { error } = await (supabase as any).from("content_projects").update(upd).eq("id", input.id);
          if (error) throw error;
        },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["content_project", vars.id] });
      qc.invalidateQueries({ queryKey: ["content_projects"] });
    },
  });
};

export const useSaveStageOutput = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      stage: number;
      output: any;
      ai_reasoning?: string;
      label?: string;
      mark_done?: boolean;
    }) => {
      return enqueueAction({
        projectId: input.project_id,
        operation: `save stage ${input.stage}`,
        run: async () => {
          const { data: existing } = await (supabase as any)
            .from("content_project_stages")
            .select("id, output")
            .eq("project_id", input.project_id)
            .eq("stage", input.stage)
            .maybeSingle();

          if (existing?.id) {
            const mergedOutput = { ...(existing.output ?? {}), ...(input.output ?? {}) };
            const { error } = await (supabase as any)
              .from("content_project_stages")
              .update({
                output: mergedOutput,
                ai_reasoning: input.ai_reasoning ?? null,
                status: input.mark_done ? "done" : "active",
              })
              .eq("id", existing.id);
            if (error) throw error;
          } else {
            const { error } = await (supabase as any).from("content_project_stages").insert({
              project_id: input.project_id,
              stage: input.stage,
              status: input.mark_done ? "done" : "active",
              output: input.output,
              ai_reasoning: input.ai_reasoning ?? null,
            });
            if (error) throw error;
          }

          await (supabase as any).from("content_project_versions").insert({
            project_id: input.project_id,
            stage: input.stage,
            payload: input.output,
            diff_from_previous: { type: "stage_snapshot", stage: input.stage },
            label: input.label ?? null,
          });

          if (input.mark_done) {
            await (supabase as any)
              .from("content_projects")
              .update({ current_stage: Math.max(input.stage + 1, 1) })
              .eq("id", input.project_id);
          }
        },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["content_project_stages", vars.project_id] });
      qc.invalidateQueries({ queryKey: ["content_project_versions", vars.project_id] });
      qc.invalidateQueries({ queryKey: ["content_project", vars.project_id] });
      qc.invalidateQueries({ queryKey: ["content_projects"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar estágio"),
  });
};

export const useDeleteProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("content_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_projects"] });
      toast.success("Projeto removido");
    },
  });
};

// ─── Orquestrador: chama agentes especializados, sempre injeta o context ───
export const useRunStageAgent = () => {
  const save = useSaveStageOutput();
  const updateCtx = useUpdateProjectContext();

  return useMutation({
    mutationFn: async (input: {
      project: ContentProject;
      agent: "structurer" | "topic-writer" | "script-writer" | "script-critic";
      stage: number;
      payload?: any;
    }) => {
      const { data, error } = await supabase.functions.invoke("content-pipeline-agent", {
        body: {
          agent: input.agent,
          project_id: input.project.id,
          context: input.project.context,
          payload: input.payload ?? {},
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      await save.mutateAsync({
        project_id: input.project.id,
        stage: input.stage,
        output: data,
        ai_reasoning: (data as any)?.reasoning ?? null,
        mark_done: true,
      });

      // Merge contextual hints opcionais que o agente devolva
      if ((data as any)?.context_patch) {
        await updateCtx.mutateAsync({
          id: input.project.id,
          patch: (data as any).context_patch,
        });
      }
      return data;
    },
    onError: (e: any) => toast.error(e.message ?? "Erro no agente de IA"),
  });
};
