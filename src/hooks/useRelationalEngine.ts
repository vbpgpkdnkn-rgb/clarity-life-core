import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RelationalObjective = "atrair_paciente" | "autoridade" | "identificacao" | "ensinar";
export type RelationalFormat = "reel" | "carrossel" | "legenda";

// ─── Tópicos: tema + parágrafo guia ───
export interface TopicBlock {
  theme: string;
  guidance: string;
  connects_to_next: string;
}
export interface RelationalTopicsResult {
  mode: "topics";
  theme: string;
  format: RelationalFormat;
  objective: RelationalObjective;
  anchor: string;
  narrative_arc: string;
  hook: { theme: string; guidance: string };
  topics: TopicBlock[];
  closing: { theme: string; guidance: string };
}

// ─── Roteiro autoral: parágrafos editáveis ───
export interface ScriptParagraph {
  role: string;
  text: string;
}
export interface RelationalScriptResult {
  mode: "single";
  theme: string;
  objective: RelationalObjective;
  format: RelationalFormat;
  anchor: string;
  paragraphs: ScriptParagraph[];
}

// ─── Variações de ângulo ───
export interface AngleVariation {
  angle_name: string;
  one_liner: string;
  opening_idea: string;
  why_this_works: string;
}
export interface RelationalVariationsResult {
  mode: "variations";
  theme: string;
  variations: AngleVariation[];
}

// ─── Série conectada ───
export interface SeriesPiece {
  order: number;
  theme: string;
  format: RelationalFormat;
  one_liner: string;
  guidance: string;
  builds_on_previous: string;
}
export interface RelationalSeriesResult {
  mode: "series";
  series_name: string;
  narrative_arc: string;
  pieces: SeriesPiece[];
}

// Compat (mantidos para não quebrar refs antigas)
export type RelationalSingleResult = RelationalScriptResult;
export type RelationalTimedResult = any;
export type RelationalBatchResult = any;
export type RelationalAnchor = string;

export const useGenerateRelational = () => {
  return useMutation({
    mutationFn: async (input: {
      mode: "topics" | "single" | "variations" | "series" | "regen_paragraph";
      theme?: string;
      my_perspective?: string;
      objective?: string;
      format?: string;
      anchor?: string;
      audience_context?: string;
      voice_calibration?: string;
      avoid?: string[];
      piece_count?: number;
      // regen_paragraph
      role?: string;
      original?: string;
      full_context?: string;
      direction?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("relational-content-engine", {
        body: input,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onError: (e: any) => toast.error(e.message ?? "Erro na IA"),
  });
};

export const useSaveRelationalAsIdea = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      theme?: string;
      full_text: string;
      format?: string;
      anchor?: string;
      objective?: string;
    }) => {
      const formatMap: Record<string, string> = {
        reel: "reels",
        carrossel: "carrossel",
        legenda: "texto",
      };
      const payload: any = {
        title: input.title.slice(0, 200),
        theme: input.theme ?? null,
        scope: "profissional",
        suggested_format: formatMap[input.format ?? "reel"] ?? "reels",
        notes: input.full_text,
        source: `Motor Relacional · ${input.anchor ?? "auto"} · ${input.objective ?? "identificacao"}`,
        used: false,
      };
      const { error } = await (supabase as any).from("content_ideas").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_ideas"] });
      toast.success("Salvo como Ideia editorial");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
};

export const useRelationalIdeas = () =>
  useQuery({
    queryKey: ["content_ideas", "relational"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("content_ideas")
        .select("*")
        .ilike("source", "Motor Relacional%")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
