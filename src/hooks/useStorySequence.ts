import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StorySequenceItem {
  label: string;
  type: "texto" | "video_curto" | "enquete" | "caixinha" | "imagem";
  narrative: string;
  text_overlay: string;
  connection_to_next: string;
  interaction: string;
}

export interface StorySequence {
  id: string;
  piece_id: string | null;
  theme: string | null;
  objective: string;
  tone: string;
  stories: StorySequenceItem[];
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
}

export const useGenerateStorySequence = () =>
  useMutation({
    mutationFn: async (input: { theme?: string; source_content?: string; objective: string; tone: string; quantity: number | "auto" }) => {
      const { data, error } = await supabase.functions.invoke("stories-sequence-generator", { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { stories: StorySequenceItem[] };
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao gerar stories"),
  });

export const useSaveStorySequence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      piece_id?: string | null;
      theme?: string | null;
      objective: string;
      tone: string;
      stories: StorySequenceItem[];
      scheduled_date?: string | null;
    }) => {
      const { data, error } = await (supabase as any)
        .from("content_story_sequences")
        .insert({
          piece_id: input.piece_id ?? null,
          theme: input.theme ?? null,
          objective: input.objective,
          tone: input.tone,
          stories: input.stories,
          scheduled_date: input.scheduled_date ?? null,
        })
        .select().single();
      if (error) throw error;
      // também cria entradas em content_stories para aparecer no Editorial
      if (input.scheduled_date) {
        const rows = input.stories.map((s) => ({
          date: input.scheduled_date,
          slot: "outro" as const,
          title: s.label,
          description: s.narrative,
          notes: s.text_overlay,
          done: false,
          scope: "profissional" as const,
        }));
        await (supabase as any).from("content_stories").insert(rows);
      }
      return data as StorySequence;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_story_sequences"] });
      qc.invalidateQueries({ queryKey: ["content_stories"] });
      toast.success("Stories enviados ao Editorial");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
};
