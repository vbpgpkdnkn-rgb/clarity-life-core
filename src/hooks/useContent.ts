import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addDaysISO, todayISO, startOfWeekISO, endOfWeekISO } from "@/lib/format";

export type ContentStatus = "ideia" | "em_producao" | "pronto" | "publicado" | "arquivado";
export type ContentFormat = "reels" | "carrossel" | "texto" | "stories" | "video" | "podcast" | "newsletter";

export interface ContentIdea {
  id: string;
  title: string;
  theme: string | null;
  scope: "pessoal" | "profissional";
  suggested_format: ContentFormat | null;
  notes: string | null;
  source: string | null;
  used: boolean;
  idea_status?: "nova" | "enriquecida" | "em_desenvolvimento" | "roteiro_pronto" | "arquivada";
  context?: string | null;
  preferred_format?: string | null;
  clinical_anchor?: string | null;
  urgency?: "postar_semana" | "sem_pressa" | "evergreen";
  archived_at?: string | null;
  created_at: string;
}

export interface ContentPiece {
  id: string;
  title: string;
  theme: string | null;
  format: ContentFormat;
  platform: string | null;
  status: ContentStatus;
  scope: "pessoal" | "profissional";
  planned_date: string | null;
  published_at: string | null;
  script: string | null;
  hook: string | null;
  cta: string | null;
  notes: string | null;
  checklist: { label: string; done: boolean }[];
  idea_id: string | null;
  goal_id: string | null;
  priority: "alta" | "media" | "baixa";
  generated_dms: number;
  booked_appointment: boolean;
  cta_type: string | null;
  pipeline_stage?: "roteiro_pronto" | "gravando" | "editando" | "pronto_postar" | "agendado" | "publicado";
  clinical_anchor?: string | null;
  audience_context?: string | null;
  production_notes?: string | null;
  target_publish_at?: string | null;
  saves?: number;
  appointments_booked?: number;
  created_at: string;
  updated_at: string;
}

export type CtaType = "autoridade" | "dor" | "convite" | "educativo" | "bastidor" | "depoimento" | "outro";
export const CTA_TYPES: CtaType[] = ["autoridade", "dor", "convite", "educativo", "bastidor", "depoimento", "outro"];

export interface ContentMetric {
  id: string;
  piece_id: string;
  measured_at: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  engagement_rate: number;
  notes: string | null;
}

// ---------- Ideas ----------
export const useContentIdeas = () =>
  useQuery({
    queryKey: ["content_ideas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("content_ideas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContentIdea[];
    },
  });

export const useUpsertIdea = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (idea: Partial<ContentIdea> & { title: string }) => {
      const payload: any = { ...idea };
      if (idea.id) {
        const { error } = await (supabase as any).from("content_ideas").update(payload).eq("id", idea.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("content_ideas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_ideas"] });
      toast.success("Ideia salva");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
};

export const useDeleteIdea = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("content_ideas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_ideas"] });
      toast.success("Ideia removida");
    },
  });
};

// ---------- Pieces ----------
export const useContentPieces = () =>
  useQuery({
    queryKey: ["content_pieces"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("content_pieces")
        .select("*")
        .order("planned_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ContentPiece[];
    },
  });

/** Templates de tarefas por formato (offsets em dias antes do publish). */
const TASK_TEMPLATES: Record<ContentFormat, { title: string; offset: number }[]> = {
  reels: [
    { title: "Roteiro", offset: -3 },
    { title: "Gravação", offset: -2 },
    { title: "Edição", offset: -1 },
    { title: "Publicação", offset: 0 },
  ],
  video: [
    { title: "Roteiro", offset: -5 },
    { title: "Gravação", offset: -3 },
    { title: "Edição", offset: -1 },
    { title: "Publicação", offset: 0 },
  ],
  carrossel: [
    { title: "Estrutura e copy", offset: -2 },
    { title: "Design dos slides", offset: -1 },
    { title: "Publicação", offset: 0 },
  ],
  texto: [
    { title: "Rascunho", offset: -2 },
    { title: "Revisão", offset: -1 },
    { title: "Publicação", offset: 0 },
  ],
  stories: [
    { title: "Sequência e copy", offset: -1 },
    { title: "Publicação", offset: 0 },
  ],
  podcast: [
    { title: "Pauta", offset: -5 },
    { title: "Gravação", offset: -3 },
    { title: "Edição", offset: -1 },
    { title: "Publicação", offset: 0 },
  ],
  newsletter: [
    { title: "Rascunho", offset: -3 },
    { title: "Revisão", offset: -1 },
    { title: "Envio", offset: 0 },
  ],
};

async function generateTasksForPiece(piece: ContentPiece) {
  if (!piece.planned_date) return;
  // Remove tasks antigas vinculadas
  await (supabase as any).from("tasks").delete().eq("content_piece_id", piece.id);
  const tpl = TASK_TEMPLATES[piece.format] ?? TASK_TEMPLATES.reels;
  const rows = tpl.map((t) => ({
    title: `${t.title}: ${piece.title}`,
    due_date: addDaysISO(piece.planned_date!, t.offset),
    priority: piece.priority,
    scope: piece.scope,
    status: "pendente",
    content_piece_id: piece.id,
    goal_id: piece.goal_id,
  }));
  if (rows.length) {
    const { error } = await (supabase as any).from("tasks").insert(rows);
    if (error) throw error;
  }
}

export const useUpsertPiece = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ContentPiece> & { title: string; generateTasks?: boolean }) => {
      const { generateTasks, ...piece } = input as any;
      let saved: ContentPiece;
      if (piece.id) {
        const { data, error } = await (supabase as any)
          .from("content_pieces")
          .update(piece)
          .eq("id", piece.id)
          .select()
          .single();
        if (error) throw error;
        saved = data as ContentPiece;
      } else {
        const { data, error } = await (supabase as any)
          .from("content_pieces")
          .insert(piece)
          .select()
          .single();
        if (error) throw error;
        saved = data as ContentPiece;
      }
      if (generateTasks && saved.planned_date) {
        await generateTasksForPiece(saved);
      }
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_pieces"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Conteúdo salvo");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
};

export const useGenerateTasksForPiece = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (piece: ContentPiece) => {
      await generateTasksForPiece(piece);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefas geradas no Planner");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao gerar tarefas"),
  });
};

export const useDeletePiece = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("content_pieces").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_pieces"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Conteúdo removido");
    },
  });
};

// ---------- Metrics ----------
export const useContentMetrics = () =>
  useQuery({
    queryKey: ["content_metrics"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("content_metrics")
        .select("*")
        .order("measured_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContentMetric[];
    },
  });

export const useUpsertMetric = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Partial<ContentMetric> & { piece_id: string }) => {
      const payload: any = { ...m };
      if (m.id) {
        const { error } = await (supabase as any).from("content_metrics").update(payload).eq("id", m.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("content_metrics").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_metrics"] });
      toast.success("Métricas salvas");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
};

// ---------- Consistência semanal ----------
export function useContentConsistency(scopeFilter?: "pessoal" | "profissional") {
  const { data: pieces = [] } = useContentPieces();
  const weekStart = startOfWeekISO();
  const weekEnd = endOfWeekISO();
  const filtered = scopeFilter ? pieces.filter((p) => p.scope === scopeFilter) : pieces;
  const publishedThisWeek = filtered.filter(
    (p) => p.published_at && p.published_at >= weekStart && p.published_at <= weekEnd,
  );
  const plannedThisWeek = filtered.filter(
    (p) => p.planned_date && p.planned_date >= weekStart && p.planned_date <= weekEnd,
  );
  const days = new Set(publishedThisWeek.map((p) => p.published_at));
  const targetPerWeek = 3; // default; pode vir de uma meta de tipo conteudo
  const pct = Math.min(100, Math.round((publishedThisWeek.length / targetPerWeek) * 100));
  return {
    weekStart,
    weekEnd,
    publishedCount: publishedThisWeek.length,
    plannedCount: plannedThisWeek.length,
    productiveDays: days.size,
    targetPerWeek,
    pct,
  };
}

// ---------- Hoje (para Modo Foco) ----------
export function useTodayContent() {
  const { data: pieces = [] } = useContentPieces();
  const today = todayISO();
  const dueToday = pieces.filter(
    (p) =>
      p.status !== "publicado" &&
      p.status !== "arquivado" &&
      ((p.planned_date && p.planned_date <= today) || p.status === "pronto"),
  );
  const next = pieces.find((p) => p.planned_date && p.planned_date > today);
  return { dueToday, next };
}

// ---------- IA ----------
export const useContentIdeator = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { area?: string; scope?: string; existing_themes?: string[]; briefing?: string }) => {
      const { data, error } = await supabase.functions.invoke("content-ideator", { body: input });
      if (error) throw error;
      return data as {
        suggestions: { title: string; theme: string; format: ContentFormat; hook: string; rationale: string }[];
      };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content_ideas"] }),
    onError: (e: any) => toast.error(e.message ?? "Erro na IA"),
  });
};

export const useContentWeeklyPlan = () => {
  return useMutation({
    mutationFn: async (input: {
      scope?: string;
      target_per_week?: number;
      pieces: Pick<ContentPiece, "id" | "title" | "status" | "format" | "planned_date" | "theme">[];
      ideas: Pick<ContentIdea, "id" | "title" | "theme" | "suggested_format">[];
      consistency_pct: number;
      briefing?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("content-weekly-plan", { body: input });
      if (error) throw error;
      return data as {
        plan: {
          summary: string;
          schedule: { day: string; title: string; format: ContentFormat; reason: string; piece_id?: string }[];
          adjustments: string[];
          today_action: string;
        };
      };
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao gerar plano"),
  });
};
