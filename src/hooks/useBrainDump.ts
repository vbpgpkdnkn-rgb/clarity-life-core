import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useBrainDump = (showProcessed = false) =>
  useQuery({
    queryKey: ["brain_dump", showProcessed],
    queryFn: async () => {
      let q = supabase.from("brain_dump_items").select("*").order("created_at", { ascending: false });
      if (!showProcessed) q = q.eq("processed", false);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAddBrainDump = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("brain_dump_items").insert({ content });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brain_dump"] }),
    onError: (e: any) => toast.error(e.message),
  });
};

export const useProcessBrainDump = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, converted_to, converted_id }: { id: string; converted_to: string; converted_id?: string }) => {
      const { error } = await supabase
        .from("brain_dump_items")
        .update({ processed: true, converted_to, converted_id: converted_id ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brain_dump"] }),
  });
};

export const useDeleteBrainDump = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brain_dump_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brain_dump"] }),
  });
};
