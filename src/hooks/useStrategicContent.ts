import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DecisionVerdict = "postar" | "refazer" | "descartar";

export interface DecisionCriterion {
  value: boolean;
  reason: string;
}

export interface StrategicDecision {
  generates_pain: DecisionCriterion;
  generates_identification: DecisionCriterion;
  creates_urgency: DecisionCriterion;
  verdict: DecisionVerdict;
  verdict_reason: string;
}

export interface StrategicContentResult {
  intent: string;
  trigger: string;
  conflict: string;
  hook: string;
  insight: string;
  cta: string;
  format: string;
  theme: string;
  script: string;
  decision: StrategicDecision;
  score: number;
  approved: boolean;
}

export interface StrategicScriptRow extends StrategicContentResult {
  id: string;
  scope: string;
  saved_as_idea_id: string | null;
  raw: any;
  created_at: string;
  updated_at: string;
}

export function useGenerateStrategicContent() {
  return useMutation({
    mutationFn: async (input: {
      briefing?: string;
      angle?: string;
      intent?: string;
      format?: string;
      avoid?: string[];
      refine_from?: any;
    }) => {
      const { data, error } = await supabase.functions.invoke("strategic-content-generator", {
        body: input,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as StrategicContentResult;
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao gerar conteúdo"),
  });
}

export function useStrategicScripts() {
  return useQuery({
    queryKey: ["strategic_scripts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("strategic_scripts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as StrategicScriptRow[];
    },
  });
}

export function useSaveStrategicScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: StrategicContentResult & { scope?: string; saved_as_idea_id?: string | null },
    ) => {
      const payload = {
        scope: input.scope ?? "profissional",
        intent: input.intent,
        trigger: input.trigger,
        conflict: input.conflict,
        hook: input.hook,
        insight: input.insight,
        cta: input.cta,
        script: input.script,
        format: input.format,
        theme: input.theme,
        decision: input.decision,
        score: input.score,
        approved: input.approved,
        saved_as_idea_id: input.saved_as_idea_id ?? null,
        raw: input,
      };
      const { data, error } = await (supabase as any)
        .from("strategic_scripts")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as StrategicScriptRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["strategic_scripts"] }),
    onError: (e: any) => toast.error(e?.message || "Falha ao salvar"),
  });
}

export function useDeleteStrategicScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("strategic_scripts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["strategic_scripts"] }),
  });
}
