import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFocusSessions = (from?: string, to?: string) =>
  useQuery({
    queryKey: ["focus_sessions", from, to],
    queryFn: async () => {
      let q = supabase.from("focus_sessions").select("*").order("started_at", { ascending: false });
      if (from) q = q.gte("started_at", from);
      if (to) q = q.lte("started_at", to);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useStartFocusSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: { task_id?: string; project_id?: string; planned_minutes: number; kind?: string }) => {
      const { data, error } = await supabase.from("focus_sessions").insert(s).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["focus_sessions"] }),
  });
};

export const useEndFocusSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actual_minutes, completed, notes, interruptions }: any) => {
      const { error } = await supabase
        .from("focus_sessions")
        .update({ ended_at: new Date().toISOString(), actual_minutes, completed, notes, interruptions })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["focus_sessions"] }),
  });
};
