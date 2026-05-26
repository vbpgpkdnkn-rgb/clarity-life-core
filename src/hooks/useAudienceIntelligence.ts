import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AudienceAngle = "aprofundar" | "discordar" | "diferente" | "audiencia" | "livre";

export interface AudienceIdea {
  title: string;
  angle_adopted: string;
  why_angle: string;
  hook: string;
  clinical_anchor: "IBCT" | "Gottman" | "IBCT+Gottman";
  format: "reel" | "carrossel" | "legenda";
  format_rationale: string;
  audience_evidence: string;
  energia?: "topo" | "meio" | "fundo";
  // estado local de pipeline (anexado via banco)
  dev_status?: "nao_desenvolvida" | "em_desenvolvimento" | "desenvolvida";
}


export interface AudienceAnalysisResult {
  patterns: string[];
  ideas: AudienceIdea[];
}

export interface AudienceAnalysisRow {
  id: string;
  created_at: string;
  updated_at: string;
  title: string | null;
  author: string | null;
  angle: AudienceAngle;
  transcript: string;
  comments: string;
  my_perspective: string;
  patterns: string[];
  ideas: AudienceIdea[];
}

export const useAudienceIntelligence = () =>
  useMutation({
    mutationFn: async (input: {
      transcript: string;
      comments: string;
      my_perspective: string;
      author?: string;
      angle: AudienceAngle;
    }) => {
      const { data, error } = await supabase.functions.invoke("audience-intelligence", { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as AudienceAnalysisResult;
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao analisar audiência"),
  });

export const useAudienceAnalyses = () =>
  useQuery({
    queryKey: ["audience_analyses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("audience_analyses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AudienceAnalysisRow[];
    },
  });

export const useSaveAudienceAnalysis = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<AudienceAnalysisRow, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await (supabase as any)
        .from("audience_analyses")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as AudienceAnalysisRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audience_analyses"] }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar análise"),
  });
};

export const useUpdateAudienceIdeaStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ analysis_id, idea_index, dev_status }: { analysis_id: string; idea_index: number; dev_status: AudienceIdea["dev_status"] }) => {
      const { data: row, error: e1 } = await (supabase as any)
        .from("audience_analyses").select("ideas").eq("id", analysis_id).single();
      if (e1) throw e1;
      const ideas = (row?.ideas ?? []) as AudienceIdea[];
      ideas[idea_index] = { ...ideas[idea_index], dev_status };
      const { error: e2 } = await (supabase as any)
        .from("audience_analyses").update({ ideas }).eq("id", analysis_id);
      if (e2) throw e2;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audience_analyses"] }),
  });
};

export const useDeleteAudienceAnalysis = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("audience_analyses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audience_analyses"] }),
  });
};
