import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ===================== EVENTS =====================
export const useEvents = (from?: string, to?: string) =>
  useQuery({
    queryKey: ["events", from, to],
    queryFn: async () => {
      let q = supabase.from("events").select("*").order("date").order("start_time");
      if (from) q = q.gte("date", from);
      if (to) q = q.lte("date", to);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: any) => {
      const payload = { ...e };
      if (payload.start_time === "") payload.start_time = null;
      if (payload.end_time === "") payload.end_time = null;
      if (e.id) {
        const { error } = await supabase.from("events").update(payload).eq("id", e.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento removido");
    },
  });
};

// ===================== HABITS =====================
export const useHabits = () =>
  useQuery({
    queryKey: ["habits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .eq("archived", false)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertHabit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (h: any) => {
      const payload = { ...h };
      if (payload.target_value === "") payload.target_value = null;
      if (payload.target_per_week === "") payload.target_per_week = null;
      if (h.id) {
        const { error } = await supabase.from("habits").update(payload).eq("id", h.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("habits").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      toast.success("Hábito salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteHabit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").update({ archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      toast.success("Hábito arquivado");
    },
  });
};

export const useHabitLogs = (from?: string, to?: string) =>
  useQuery({
    queryKey: ["habit_logs", from, to],
    queryFn: async () => {
      let q = supabase.from("habit_logs").select("*");
      if (from) q = q.gte("date", from);
      if (to) q = q.lte("date", to);
      const { data, error } = await q.order("date");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useToggleHabitLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ habit_id, date, value }: { habit_id: string; date: string; value?: number | null }) => {
      const { data: existing } = await supabase
        .from("habit_logs")
        .select("*")
        .eq("habit_id", habit_id)
        .eq("date", date)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from("habit_logs").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("habit_logs").insert({ habit_id, date, value: value ?? null, done: true });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habit_logs"] }),
    onError: (e: any) => toast.error(e.message),
  });
};

// ===================== WEEKLY PLAN =====================
export const useWeeklyPlan = (week_start: string) =>
  useQuery({
    queryKey: ["weekly_plan", week_start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_plans")
        .select("*")
        .eq("week_start", week_start)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useUpsertWeeklyPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: any) => {
      const { error } = await supabase
        .from("weekly_plans")
        .upsert(p, { onConflict: "week_start" });
      if (error) throw error;
    },
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: ["weekly_plan", vars.week_start] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

// ===================== DAILY PLAN =====================
export const useDailyPlan = (date: string) =>
  useQuery({
    queryKey: ["daily_plan", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_plans")
        .select("*")
        .eq("date", date)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useUpsertDailyPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: any) => {
      const { error } = await supabase
        .from("daily_plans")
        .upsert(p, { onConflict: "date" });
      if (error) throw error;
    },
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: ["daily_plan", vars.date] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

// ===================== WEEKLY REVIEW =====================
export const useWeeklyReview = (week_start: string) =>
  useQuery({
    queryKey: ["weekly_review", week_start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_reviews")
        .select("*")
        .eq("week_start", week_start)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useUpsertWeeklyReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: any) => {
      const { error } = await supabase
        .from("weekly_reviews")
        .upsert(r, { onConflict: "week_start" });
      if (error) throw error;
    },
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: ["weekly_review", vars.week_start] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

// ===================== FREE NOTES =====================
export const useFreeNotes = () =>
  useQuery({
    queryKey: ["free_notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("free_notes")
        .select("*")
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertFreeNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (n: any) => {
      if (n.id) {
        const { error } = await supabase.from("free_notes").update(n).eq("id", n.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("free_notes").insert(n).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["free_notes"] }),
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteFreeNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("free_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["free_notes"] });
      toast.success("Nota removida");
    },
  });
};
