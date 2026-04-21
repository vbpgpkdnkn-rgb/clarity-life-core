import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { todayISO, addDaysISO } from "@/lib/format";

// ====================== STORIES ======================
export type StorySlot = "bastidores" | "rotina" | "pergunta" | "interacao" | "reflexao" | "dica" | "divulgacao" | "outro";
export const STORY_SLOT_LABEL: Record<StorySlot, string> = {
  bastidores: "Bastidores",
  rotina: "Rotina",
  pergunta: "Pergunta",
  interacao: "Interação",
  reflexao: "Reflexão",
  dica: "Dica",
  divulgacao: "Divulgação",
  outro: "Outro",
};

export interface ContentStory {
  id: string;
  date: string;
  slot: StorySlot;
  title: string;
  description: string | null;
  scope: "pessoal" | "profissional";
  done: boolean;
  done_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useContentStories = (rangeDays = 14) =>
  useQuery({
    queryKey: ["content_stories", rangeDays],
    queryFn: async () => {
      const start = addDaysISO(todayISO(), -rangeDays);
      const end = addDaysISO(todayISO(), rangeDays);
      const { data, error } = await (supabase as any)
        .from("content_stories")
        .select("*")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContentStory[];
    },
  });

export const useUpsertStory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<ContentStory> & { title: string }) => {
      const payload: any = { ...s };
      if (s.id) {
        const { error } = await (supabase as any).from("content_stories").update(payload).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("content_stories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_stories"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar story"),
  });
};

export const useToggleStory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await (supabase as any)
        .from("content_stories")
        .update({ done, done_at: done ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content_stories"] }),
  });
};

export const useDeleteStory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("content_stories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_stories"] });
      toast.success("Story removido");
    },
  });
};

/** Consistência diária de stories (últimos N dias com pelo menos 1 done). */
export function useStoriesConsistency(scopeFilter?: "pessoal" | "profissional", windowDays = 7) {
  const { data: stories = [] } = useContentStories(windowDays);
  const today = todayISO();
  const filtered = scopeFilter ? stories.filter((s) => s.scope === scopeFilter) : stories;

  // Dias da janela
  const days: string[] = [];
  for (let i = windowDays - 1; i >= 0; i--) days.push(addDaysISO(today, -i));

  const dayMap = new Map<string, { planned: number; done: number }>();
  days.forEach((d) => dayMap.set(d, { planned: 0, done: 0 }));
  filtered.forEach((s) => {
    if (!dayMap.has(s.date)) return;
    const cur = dayMap.get(s.date)!;
    cur.planned += 1;
    if (s.done) cur.done += 1;
  });

  const productiveDays = Array.from(dayMap.values()).filter((v) => v.done > 0).length;
  const totalDays = days.length;
  const pct = Math.round((productiveDays / totalDays) * 100);

  // Consecutive streak (dias seguidos ATÉ hoje com pelo menos 1 story done)
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if ((dayMap.get(days[i])?.done ?? 0) > 0) streak += 1;
    else break;
  }

  const todayPlanned = dayMap.get(today)?.planned ?? 0;
  const todayDone = dayMap.get(today)?.done ?? 0;

  return { days, dayMap, productiveDays, totalDays, pct, streak, todayPlanned, todayDone };
}

// ====================== REFERENCES ======================
export interface ContentReference {
  id: string;
  source_text: string | null;
  source_url: string | null;
  source_author: string | null;
  scope: "pessoal" | "profissional";
  analysis: any;
  adapted_title: string | null;
  adapted_format: string | null;
  adapted_hook: string | null;
  adapted_outline: string | null;
  used: boolean;
  piece_id: string | null;
  created_at: string;
}

export const useContentReferences = () =>
  useQuery({
    queryKey: ["content_references"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("content_references")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContentReference[];
    },
  });

export const useDeleteReference = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("content_references").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_references"] });
      toast.success("Referência removida");
    },
  });
};

/** Analisa referência via IA e salva no banco. */
export const useAnalyzeReference = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      source_text?: string;
      source_url?: string;
      source_author?: string;
      scope?: "pessoal" | "profissional";
      niche?: string;
      own_themes?: string[];
      briefing?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("content-reference-analyzer", { body: input });
      if (error) throw error;
      const r = data as any;
      // Salva no banco
      const { error: insErr } = await (supabase as any).from("content_references").insert({
        source_text: input.source_text ?? null,
        source_url: input.source_url ?? null,
        source_author: input.source_author ?? null,
        scope: input.scope ?? "profissional",
        analysis: r.source_analysis ?? {},
        adapted_title: r.adapted?.title ?? null,
        adapted_format: r.adapted?.format ?? null,
        adapted_hook: r.adapted?.hook ?? null,
        adapted_outline: `${r.adapted?.outline ?? ""}\n\nCTA: ${r.adapted?.cta ?? ""}\n\nNota: ${r.strategic_note ?? ""}`,
      });
      if (insErr) throw insErr;
      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_references"] });
      toast.success("Referência analisada e adaptada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao analisar"),
  });
};

// ====================== INSIGHTS ======================
export const useContentInsights = () => {
  return useMutation({
    mutationFn: async (input: { pieces: any[]; metrics: any[] }) => {
      const { data, error } = await supabase.functions.invoke("content-insights", { body: input });
      if (error) throw error;
      return data as {
        insights: {
          summary: string;
          top_themes: { theme: string; evidence: string }[];
          top_formats: { format: string; evidence: string }[];
          recommendations: string[];
          reuse_suggestions: { piece_id?: string; title: string; new_format: string; why: string }[];
        };
      };
    },
    onError: (e: any) => toast.error(e.message ?? "Erro na IA de insights"),
  });
};

// ====================== REUSE ======================
export const useContentReuseSuggest = () => {
  return useMutation({
    mutationFn: async (input: { pieces: any[]; metrics: any[] }) => {
      const { data, error } = await supabase.functions.invoke("content-reuse-suggest", { body: input });
      if (error) throw error;
      return data as {
        suggestions: {
          piece_id: string;
          original_title: string;
          new_format: string;
          new_angle: string;
          why: string;
        }[];
      };
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao gerar sugestões"),
  });
};

// ====================== ALERTAS DE CONSISTÊNCIA ======================
export interface ConsistencyAlert {
  level: "info" | "warning" | "critical";
  message: string;
  action: string;
}

export function useConsistencyAlerts(scopeFilter?: "pessoal" | "profissional"): ConsistencyAlert[] {
  const stories = useStoriesConsistency(scopeFilter, 7);
  const alerts: ConsistencyAlert[] = [];

  // Sem story hoje
  if (stories.todayDone === 0 && stories.todayPlanned === 0) {
    alerts.push({
      level: "warning",
      message: "Você ainda não planejou stories pra hoje",
      action: "Crie pelo menos 3 stories agora.",
    });
  } else if (stories.todayPlanned > 0 && stories.todayDone === 0) {
    alerts.push({
      level: "warning",
      message: `${stories.todayPlanned} stories planejados, 0 publicados`,
      action: "Publique o primeiro story agora.",
    });
  }

  // Streak quebrado
  if (stories.streak === 0 && stories.productiveDays < 3) {
    alerts.push({
      level: "critical",
      message: "Consistência caiu nos últimos dias",
      action: "Produza um conteúdo simples hoje.",
    });
  }

  // Streak forte
  if (stories.streak >= 5) {
    alerts.push({
      level: "info",
      message: `${stories.streak} dias seguidos postando stories`,
      action: "Mantenha o ritmo.",
    });
  }

  return alerts;
}
