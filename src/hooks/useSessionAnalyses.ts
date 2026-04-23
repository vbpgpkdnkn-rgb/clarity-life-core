import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AnalysisDepth = "rapido" | "estrategico" | "profundo";
export type AnalysisKind = "single" | "comparative";

export type AnalysisSection = {
  key: string;
  title: string;
  bullets: string[];
};

export type AnalysisResult = {
  sections: AnalysisSection[];
};

export const useSessionAnalyses = (patientId?: string) =>
  useQuery({
    queryKey: ["session_analyses", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from("session_analyses")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!patientId,
  });

export const useGenerateAnalysis = () =>
  useMutation({
    mutationFn: async (params: {
      mode: AnalysisKind;
      depth: AnalysisDepth;
      transcript: string;
      patient_name?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("clinical-session-analysis", {
        body: params,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as any).result as AnalysisResult;
    },
    onError: (e: any) => toast.error(e.message || "Erro ao gerar análise"),
  });

export const useSaveAnalysis = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      patient_id: string;
      kind: AnalysisKind;
      depth: AnalysisDepth;
      transcript: string;
      result: AnalysisResult;
      title?: string;
      session_ids?: string[];
    }) => {
      const { error } = await supabase.from("session_analyses").insert({
        patient_id: params.patient_id,
        kind: params.kind,
        depth: params.depth,
        transcript: params.transcript,
        result: params.result as any,
        title: params.title ?? null,
        session_ids: (params.session_ids ?? []) as any,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["session_analyses", vars.patient_id] });
      toast.success("Análise salva no histórico");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteAnalysis = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("session_analyses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session_analyses"] });
      toast.success("Análise removida");
    },
  });
};

const DRAFT_KEY = "clinical_analysis_draft";
const DEPTH_KEY = "clinical_analysis_depth";

export function loadDraft(patientId: string, kind: AnalysisKind): string {
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY}:${patientId}:${kind}`);
    return raw ?? "";
  } catch {
    return "";
  }
}
export function saveDraft(patientId: string, kind: AnalysisKind, value: string) {
  try {
    if (value) localStorage.setItem(`${DRAFT_KEY}:${patientId}:${kind}`, value);
    else localStorage.removeItem(`${DRAFT_KEY}:${patientId}:${kind}`);
  } catch {/* noop */}
}
export function loadLastDepth(): AnalysisDepth {
  try {
    const v = localStorage.getItem(DEPTH_KEY) as AnalysisDepth | null;
    return v && ["rapido", "estrategico", "profundo"].includes(v) ? v : "estrategico";
  } catch {
    return "estrategico";
  }
}
export function saveLastDepth(d: AnalysisDepth) {
  try { localStorage.setItem(DEPTH_KEY, d); } catch {/* noop */}
}
