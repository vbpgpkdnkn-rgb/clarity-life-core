import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useLifeAreas = () =>
  useQuery({
    queryKey: ["life_areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("life_areas")
        .select("*")
        .eq("active", true)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertLifeArea = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: any) => {
      if (a.id) {
        const { error } = await supabase.from("life_areas").update(a).eq("id", a.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("life_areas").insert(a);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["life_areas"] });
      toast.success("Área salva");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

/** Score por área: % das tarefas concluídas + hábitos cumpridos nos últimos 14 dias. */
export const useAreaBalance = () => {
  return useQuery({
    queryKey: ["area_balance"],
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
      const [{ data: areas }, { data: tasks }, { data: logs }, { data: habits }] = await Promise.all([
        supabase.from("life_areas").select("*").eq("active", true).order("position"),
        supabase.from("tasks").select("area_id,status,created_at").gte("created_at", since),
        supabase.from("habit_logs").select("habit_id,date").gte("date", since),
        supabase.from("habits").select("id,area_id"),
      ]);

      const habitArea = new Map((habits ?? []).map((h: any) => [h.id, h.area_id]));
      return (areas ?? []).map((a: any) => {
        const aTasks = (tasks ?? []).filter((t: any) => t.area_id === a.id);
        const done = aTasks.filter((t: any) => t.status === "concluida").length;
        const aLogs = (logs ?? []).filter((l: any) => habitArea.get(l.habit_id) === a.id);
        const totalActivity = aTasks.length + aLogs.length;
        const score = aTasks.length === 0 && aLogs.length === 0
          ? 0
          : Math.round(((done + aLogs.length) / Math.max(1, aTasks.length + aLogs.length)) * 100);
        return { ...a, totalActivity, doneTasks: done, habitLogs: aLogs.length, score };
      });
    },
  });
};
