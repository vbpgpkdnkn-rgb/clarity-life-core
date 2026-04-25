import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AudienceAngle = "adaptar" | "oposto" | "aprofundar" | "livre";

export interface AudienceIdea {
  title: string;
  hook: string;
  clinical_anchor: "IBCT" | "Gottman" | "IBCT+Gottman";
  format: "reel" | "carrossel" | "legenda";
  format_rationale: string;
  audience_evidence: string;
}

export interface AudienceAnalysisResult {
  patterns: string[];
  ideas: AudienceIdea[];
}

export const useAudienceIntelligence = () =>
  useMutation({
    mutationFn: async (input: {
      transcript: string;
      comments: string;
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
