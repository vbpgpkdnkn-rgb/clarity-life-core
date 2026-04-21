import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { syncRecurringTasks, clearRecurringTasks } from "@/lib/recurrence";

// ============== MEAL PLANS ==============
export const useMealPlan = (date: string) =>
  useQuery({
    queryKey: ["meal_plan", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("meal_plans").select("*").eq("date", date).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useMealPlanRange = (from: string, to: string) =>
  useQuery({
    queryKey: ["meal_plans", from, to],
    queryFn: async () => {
      const { data, error } = await supabase.from("meal_plans").select("*").gte("date", from).lte("date", to).order("date");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertMealPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: any) => {
      const { error } = await supabase.from("meal_plans").upsert(m, { onConflict: "date" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal_plan"] });
      qc.invalidateQueries({ queryKey: ["meal_plans"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

// ============== CLEANING ==============
export const useCleaningTasks = () =>
  useQuery({
    queryKey: ["cleaning_tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cleaning_tasks").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertCleaningTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: any) => {
      let id = t.id;
      if (id) {
        const { error } = await supabase.from("cleaning_tasks").update(t).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("cleaning_tasks").insert(t).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      // Sincroniza tarefas recorrentes
      if (Array.isArray(t.weekdays)) {
        await syncRecurringTasks({
          table: "cleaning_tasks",
          id,
          title: t.name,
          weekdays: t.weekdays,
          area_id: t.area_id ?? null,
          notes: t.notes ?? null,
          scope: "pessoal",
        });
      }
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cleaning_tasks"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useLogCleaning = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cleaning_task_id: string) => {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("cleaning_logs").insert({ cleaning_task_id, date: today });
      if (error) throw error;
      await supabase.from("cleaning_tasks").update({ last_done: today }).eq("id", cleaning_task_id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cleaning_tasks"] }),
  });
};

export const useDeleteCleaningTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await clearRecurringTasks("cleaning_tasks", id);
      const { error } = await supabase.from("cleaning_tasks").update({ active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cleaning_tasks"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

// ============== WISHLIST ==============
export const useWishlist = () =>
  useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wishlist_items").select("*").order("acquired").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertWishlist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (w: any) => {
      if (w.id) {
        const { error } = await supabase.from("wishlist_items").update(w).eq("id", w.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wishlist_items").insert(w);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteWishlist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });
};

// ============== BOOKS ==============
export const useBooks = () =>
  useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertBook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: any) => {
      const payload = { ...b };
      ["started_at", "finished_at"].forEach((k) => { if (payload[k] === "") payload[k] = null; });
      if (b.id) {
        const { error } = await supabase.from("books").update(payload).eq("id", b.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("books").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteBook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
};

// ============== CHALLENGES ==============
export const useChallenges = () =>
  useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("challenges").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useChallengeLogs = (challenge_id?: string) =>
  useQuery({
    queryKey: ["challenge_logs", challenge_id],
    queryFn: async () => {
      if (!challenge_id) return [];
      const { data, error } = await supabase.from("challenge_logs").select("*").eq("challenge_id", challenge_id).order("date");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!challenge_id,
  });

export const useUpsertChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: any) => {
      const payload = { ...c };
      if (payload.end_date === "") payload.end_date = null;
      if (c.id) {
        const { error } = await supabase.from("challenges").update(payload).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("challenges").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenges"] }),
    onError: (e: any) => toast.error(e.message),
  });
};

export const useToggleChallengeLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ challenge_id, date }: { challenge_id: string; date: string }) => {
      const { data: existing } = await supabase
        .from("challenge_logs")
        .select("id")
        .eq("challenge_id", challenge_id)
        .eq("date", date)
        .maybeSingle();
      if (existing) {
        await supabase.from("challenge_logs").delete().eq("id", existing.id);
      } else {
        await supabase.from("challenge_logs").insert({ challenge_id, date });
      }
    },
    onSuccess: (_, vars: any) => qc.invalidateQueries({ queryKey: ["challenge_logs", vars.challenge_id] }),
  });
};

// ============== DREAMBOARD ==============
export const useDreamboard = () =>
  useQuery({
    queryKey: ["dreamboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dreamboard_items").select("*").order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertDream = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: any) => {
      if (d.id) {
        const { error } = await supabase.from("dreamboard_items").update(d).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dreamboard_items").insert(d);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dreamboard"] }),
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteDream = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dreamboard_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dreamboard"] }),
  });
};
