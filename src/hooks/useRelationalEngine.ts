import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RelationalObjective = "atrair_paciente" | "autoridade" | "identificacao" | "ensinar";
export type RelationalFormat = "reel" | "carrossel" | "legenda";
export type RelationalAnchor = "IBCT" | "Gottman" | "IBCT+Gottman" | "sem_nomear";

export interface RelationalSingleResult {
  mode: "single";
  theme: string;
  objective: RelationalObjective;
  format: RelationalFormat;
  anchor: RelationalAnchor;
  opening: string;
  pattern_naming: string;
  clinical_anchor: string;
  reframe_insight: string;
  closing: string;
  full_text: string;
}

export interface RelationalTimedBlock {
  start: number;
  end: number;
  label: string;
  text: string;
  direction: string;
}

export interface RelationalTimedResult {
  mode: "timed";
  theme: string;
  duration_seconds: number;
  objective: RelationalObjective;
  blocks: RelationalTimedBlock[];
  on_screen_text: string;
  caption: string;
}

export interface RelationalBatchItem {
  theme: string;
  objective: RelationalObjective;
  format: RelationalFormat;
  opening: string;
  full_text: string;
}

export interface RelationalBatchResult {
  mode: "batch";
  items: RelationalBatchItem[];
}

export const useGenerateRelational = () => {
  return useMutation({
    mutationFn: async (input: {
      mode: "single" | "timed" | "batch";
      theme?: string;
      insight?: string;
      objective?: string;
      format?: string;
      anchor?: string;
      duration_seconds?: number;
      quantity?: number;
      focus?: string;
      mix?: string;
      avoid?: string[];
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

// Salvar conteúdo gerado como Ideia editorial
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
        source: `Motor Relacional · ${input.anchor ?? "IBCT+Gottman"} · ${input.objective ?? "identificacao"}`,
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

// Banco de pautas: lê content_ideas que vieram do Motor Relacional
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
