import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InstagramSnapshot {
  id: string;
  scope: "pessoal" | "profissional";
  week_start: string;
  followers: number;
  followers_gained: number;
  followers_lost: number;
  reach: number;
  impressions: number;
  profile_visits: number;
  website_clicks: number;
  dms_received: number;
  appointments_booked: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useInstagramSnapshots = (scope?: "pessoal" | "profissional") =>
  useQuery({
    queryKey: ["instagram_snapshots", scope ?? "all"],
    queryFn: async () => {
      let q = (supabase as any)
        .from("instagram_snapshots")
        .select("*")
        .order("week_start", { ascending: false });
      if (scope) q = q.eq("scope", scope);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as InstagramSnapshot[];
    },
  });

export const useUpsertSnapshot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<InstagramSnapshot> & { week_start: string }) => {
      const payload: any = { ...s };
      // Auto-calcular followers_gained se houver semana anterior
      if (payload.followers && !payload.followers_gained) {
        const { data: prev } = await (supabase as any)
          .from("instagram_snapshots")
          .select("followers")
          .eq("scope", payload.scope ?? "profissional")
          .lt("week_start", payload.week_start)
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (prev?.followers) {
          payload.followers_gained = Math.max(0, payload.followers - prev.followers);
        }
      }
      if (s.id) {
        const { error } = await (supabase as any).from("instagram_snapshots").update(payload).eq("id", s.id);
        if (error) throw error;
      } else {
        // upsert por scope + week_start
        const { error } = await (supabase as any)
          .from("instagram_snapshots")
          .upsert(payload, { onConflict: "scope,week_start" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instagram_snapshots"] });
      toast.success("Snapshot salvo");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
};

export const useDeleteSnapshot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("instagram_snapshots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instagram_snapshots"] });
      toast.success("Snapshot removido");
    },
  });
};

// ---------- IA estratégica de crescimento ----------
export interface GrowthStrategy {
  diagnosis: {
    growth_phase: "estagnada" | "lenta" | "saudavel" | "acelerada";
    growth_rate_weekly_pct: number;
    acquisition_health: "fraca" | "razoavel" | "forte";
    summary: string;
  };
  growth_levers: {
    theme: string;
    format: string;
    why: string;
    expected_impact: "alto" | "medio" | "baixo";
  }[];
  acquisition_levers: {
    cta_type: string;
    theme: string;
    why: string;
    example_hook: string;
  }[];
  ideal_frequency: {
    posts_per_week: number;
    stories_per_day: number;
    rationale: string;
  };
  warnings: { kind: string; detail: string }[];
  next_week_focus: string;
}

export const useGrowthStrategy = () => {
  return useMutation({
    mutationFn: async (input: {
      scope: "pessoal" | "profissional";
      snapshots: InstagramSnapshot[];
      pieces: any[];
      metrics: any[];
    }) => {
      const { data, error } = await supabase.functions.invoke("instagram-growth-strategy", { body: input });
      if (error) throw error;
      return data as { strategy: GrowthStrategy; generated_at: string };
    },
    onError: (e: any) => toast.error(e.message ?? "Erro na IA"),
  });
};
