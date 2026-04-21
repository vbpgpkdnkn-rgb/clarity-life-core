import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============== GRATITUDE ==============
export const useGratitude = (date: string) =>
  useQuery({
    queryKey: ["gratitude", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gratitude_entries")
        .select("*")
        .eq("date", date)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useGratitudeRange = (from: string, to: string) =>
  useQuery({
    queryKey: ["gratitude_range", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gratitude_entries")
        .select("*")
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertGratitude = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: any) => {
      const { error } = await supabase
        .from("gratitude_entries")
        .upsert(g, { onConflict: "date" });
      if (error) throw error;
    },
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: ["gratitude", vars.date] });
      qc.invalidateQueries({ queryKey: ["gratitude_range"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

// ============== DAILY CHECKIN ==============
export const useDailyCheckin = (date: string) =>
  useQuery({
    queryKey: ["daily_checkin", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("date", date)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useCheckinRange = (from: string, to: string) =>
  useQuery({
    queryKey: ["checkin_range", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .gte("date", from)
        .lte("date", to)
        .order("date");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertCheckin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: any) => {
      const { error } = await supabase
        .from("daily_checkins")
        .upsert(c, { onConflict: "date" });
      if (error) throw error;
    },
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: ["daily_checkin", vars.date] });
      qc.invalidateQueries({ queryKey: ["checkin_range"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};
