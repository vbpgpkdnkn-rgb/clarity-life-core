import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RefinementMessage {
  role: "user" | "assistant";
  content: string;
  is_synthesis?: boolean;
  ts?: string;
}

export interface RefinementContext {
  title?: string;
  angle_adopted?: string;
  hook?: string;
  audience_evidence?: string;
  my_perspective?: string;
  comments?: string;
}

export interface RefinedIdea {
  title: string;
  angle: string;
  hook: string;
  audience_outcome: string;
  raw_synthesis: string;
}

export interface IdeaRefinementChat {
  id: string;
  analysis_id: string | null;
  idea_index: number | null;
  idea_title: string | null;
  context: RefinementContext;
  messages: RefinementMessage[];
  refined_idea: RefinedIdea | null;
  created_at: string;
  updated_at: string;
}

export const useIdeaRefinementChat = (chatId: string | null) =>
  useQuery({
    enabled: !!chatId,
    queryKey: ["idea_refinement_chats", chatId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("idea_refinement_chats")
        .select("*").eq("id", chatId).single();
      if (error) throw error;
      return data as IdeaRefinementChat;
    },
  });

export const useFindOrCreateRefinementChat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      analysis_id?: string | null;
      idea_index?: number | null;
      idea_title: string;
      context: RefinementContext;
    }) => {
      // tenta encontrar chat existente para essa ideia
      if (input.analysis_id != null && input.idea_index != null) {
        const { data: existing } = await (supabase as any)
          .from("idea_refinement_chats")
          .select("*")
          .eq("analysis_id", input.analysis_id)
          .eq("idea_index", input.idea_index)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) return existing as IdeaRefinementChat;
      }
      const { data, error } = await (supabase as any)
        .from("idea_refinement_chats")
        .insert({
          analysis_id: input.analysis_id ?? null,
          idea_index: input.idea_index ?? null,
          idea_title: input.idea_title,
          context: input.context,
          messages: [],
        })
        .select().single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["idea_refinement_chats"] });
      return data as IdeaRefinementChat;
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao abrir chat"),
  });
};

export const useSendRefinementMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { chat: IdeaRefinementChat; user_text: string }) => {
      const userMsg: RefinementMessage = { role: "user", content: input.user_text, ts: new Date().toISOString() };
      const messagesBefore = [...(input.chat.messages ?? []), userMsg];

      const { data, error } = await supabase.functions.invoke("idea-refinement-chat", {
        body: { context: input.chat.context, messages: messagesBefore.map((m) => ({ role: m.role, content: m.content })) },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const assistantMsg: RefinementMessage = {
        role: "assistant",
        content: (data as any).content,
        is_synthesis: (data as any).is_synthesis,
        ts: new Date().toISOString(),
      };
      const messages = [...messagesBefore, assistantMsg];

      let refined_idea: RefinedIdea | null = input.chat.refined_idea;
      if (assistantMsg.is_synthesis) {
        // extrai uma síntese mínima do texto
        const raw = assistantMsg.content.replace(/^\s*\[S[ÍI]NTESE\]\s*/i, "").trim();
        refined_idea = {
          title: input.chat.idea_title || raw.split(/[·\.\n]/)[0].slice(0, 120),
          angle: extractField(raw, "ângulo") || raw.slice(0, 200),
          hook: extractField(raw, "gancho") || "",
          audience_outcome: extractField(raw, "audi[êe]ncia") || extractField(raw, "sentir") || extractField(raw, "pensar") || "",
          raw_synthesis: raw,
        };
      }

      const { error: e2 } = await (supabase as any)
        .from("idea_refinement_chats")
        .update({ messages, refined_idea })
        .eq("id", input.chat.id);
      if (e2) throw e2;

      return { messages, refined_idea };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["idea_refinement_chats", vars.chat.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro no chat"),
  });
};

function extractField(text: string, key: string): string {
  const re = new RegExp(`${key}[^:]*:\\s*([^\\n·]+)`, "i");
  const m = text.match(re);
  return m ? m[1].trim() : "";
}
