import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useProjects = () =>
  useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useProject = (id?: string) =>
  useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

export const useUpsertProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: any) => {
      const payload = { ...p };
      ["start_date", "end_date", "deadline"].forEach((k) => {
        if (payload[k] === "") payload[k] = null;
      });
      if (p.id) {
        const { error } = await supabase.from("projects").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("projects").insert(payload).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto removido");
    },
  });
};

export const useProjectOkrs = (project_id?: string) =>
  useQuery({
    queryKey: ["project_okrs", project_id],
    queryFn: async () => {
      if (!project_id) return [];
      const { data, error } = await supabase
        .from("project_okrs")
        .select("*")
        .eq("project_id", project_id)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!project_id,
  });

export const useUpsertOkr = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (o: any) => {
      if (o.id) {
        const { error } = await supabase.from("project_okrs").update(o).eq("id", o.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_okrs").insert(o);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: ["project_okrs", vars.project_id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteOkr = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      const { error } = await supabase.from("project_okrs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: ["project_okrs", vars.project_id] });
    },
  });
};
