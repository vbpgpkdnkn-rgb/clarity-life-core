import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FocusPin {
  id: string;
  source_table: string;
  source_id: string;
  title: string;
  subtitle?: string | null;
  icon?: string | null;
  link?: string | null;
  position: number;
  pinned_at: string;
}

export const useFocusPins = () =>
  useQuery({
    queryKey: ["focus_pins"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("focus_pins")
        .select("*")
        .order("position", { ascending: true })
        .order("pinned_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FocusPin[];
    },
  });

export const useIsPinned = (source_table: string, source_id?: string) => {
  const { data: pins = [] } = useFocusPins();
  if (!source_id) return false;
  return pins.some((p) => p.source_table === source_table && p.source_id === source_id);
};

export const useTogglePin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pin: Omit<FocusPin, "id" | "position" | "pinned_at"> & { remove?: boolean }) => {
      const { data: existing } = await (supabase as any)
        .from("focus_pins")
        .select("id")
        .eq("source_table", pin.source_table)
        .eq("source_id", pin.source_id)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any).from("focus_pins").delete().eq("id", existing.id);
        if (error) throw error;
        return "removed" as const;
      }
      const { error } = await (supabase as any).from("focus_pins").insert({
        source_table: pin.source_table,
        source_id: pin.source_id,
        title: pin.title,
        subtitle: pin.subtitle ?? null,
        icon: pin.icon ?? null,
        link: pin.link ?? null,
      });
      if (error) throw error;
      return "added" as const;
    },
    onSuccess: (action) => {
      qc.invalidateQueries({ queryKey: ["focus_pins"] });
      toast.success(action === "added" ? "Fixado no Foco do Dia" : "Removido do Foco");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useRemovePin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("focus_pins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["focus_pins"] }),
  });
};
