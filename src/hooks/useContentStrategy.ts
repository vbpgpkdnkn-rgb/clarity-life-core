import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StrategyScope = "pessoal" | "profissional";

export interface ContentStrategy {
  id?: string;
  scope: StrategyScope;
  niche: string | null;
  icp: string | null;
  offer: string | null;
  tone: string | null;
  pillars: string[];
  goals: string | null;
  forbidden_topics: string | null;
  reference_brands: string | null;
  signature_format: string | null;
  posting_cadence: string | null;
  notes: string | null;
}

const empty = (scope: StrategyScope): ContentStrategy => ({
  scope,
  niche: null,
  icp: null,
  offer: null,
  tone: null,
  pillars: [],
  goals: null,
  forbidden_topics: null,
  reference_brands: null,
  signature_format: null,
  posting_cadence: null,
  notes: null,
});

export function useContentStrategy(scope: StrategyScope = "profissional") {
  return useQuery({
    queryKey: ["content_strategy", scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_strategy" as any)
        .select("*")
        .eq("scope", scope)
        .maybeSingle();
      if (error) throw error;
      return ((data as any) ?? empty(scope)) as ContentStrategy;
    },
  });
}

export function useUpsertContentStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: ContentStrategy) => {
      const payload: any = { ...s };
      payload.pillars = payload.pillars ?? [];
      const { data: existing } = await supabase
        .from("content_strategy" as any)
        .select("id")
        .eq("scope", s.scope)
        .maybeSingle();
      if ((existing as any)?.id) {
        const { error } = await supabase
          .from("content_strategy" as any)
          .update(payload)
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("content_strategy" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["content_strategy", vars.scope] });
      toast.success("Estratégia salva");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Útil para edge functions: serializa o briefing em texto. */
export function strategyToBriefing(s: ContentStrategy | undefined | null): string {
  if (!s) return "";
  const lines: string[] = [];
  if (s.niche) lines.push(`Nicho: ${s.niche}`);
  if (s.icp) lines.push(`ICP (cliente ideal): ${s.icp}`);
  if (s.offer) lines.push(`Oferta principal: ${s.offer}`);
  if (s.tone) lines.push(`Tom de voz: ${s.tone}`);
  if (s.pillars?.length) lines.push(`Pilares: ${s.pillars.join(", ")}`);
  if (s.goals) lines.push(`Objetivos: ${s.goals}`);
  if (s.signature_format) lines.push(`Formato assinatura: ${s.signature_format}`);
  if (s.posting_cadence) lines.push(`Cadência: ${s.posting_cadence}`);
  if (s.forbidden_topics) lines.push(`Evitar: ${s.forbidden_topics}`);
  if (s.reference_brands) lines.push(`Referências: ${s.reference_brands}`);
  return lines.join("\n");
}
