import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { accountBalance } from "@/lib/finance";
import { generateNextAfterCompletion } from "@/lib/recurrence";

export type Scope = "pessoal" | "profissional";
export type TaskPriority = "alta" | "media" | "baixa";
export type TaskStatus = "pendente" | "em_andamento" | "concluida";
export type TxnType = "entrada" | "saida" | "transferencia";
export type TxnNature = "fixo" | "variavel";
export type TxnStatus = "pago" | "pendente" | "futuro";
export type GoalKind = "tarefas" | "financeiro" | "marcos";
export type GoalStatus = "ativa" | "concluida" | "pausada";

// ---------- Accounts ----------
export const useAccounts = () =>
  useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAccountBalances = () => {
  const { data: accounts = [] } = useAccounts();
  const { data: txns = [] } = useTransactions();
  return accounts.map((a) => ({
    ...a,
    balance: accountBalance(a as any, txns as any),
  }));
};

// ---------- Categories ----------
export const useCategories = (kind?: "transaction" | "task") =>
  useQuery({
    queryKey: ["categories", kind],
    queryFn: async () => {
      let q = supabase.from("categories").select("*").order("name");
      if (kind) q = q.eq("kind", kind);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

// ---------- Tasks ----------
export const useTasks = () =>
  useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("priority");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: any) => {
      const payload = { ...task };
      // Detecta conclusão de tarefa recorrente para gerar a próxima ocorrência
      let triggerNext: { table: any; sourceId: string; due: string } | null = null;
      if (task.id) {
        const { data: prev } = await supabase
          .from("tasks")
          .select("status, recurrence_source_table, recurrence_source_id, due_date")
          .eq("id", task.id)
          .maybeSingle();
        const becomingDone = prev && prev.status !== "concluida" && payload.status === "concluida";
        if (becomingDone && prev?.recurrence_source_table && prev?.recurrence_source_id && prev?.due_date) {
          triggerNext = {
            table: prev.recurrence_source_table,
            sourceId: prev.recurrence_source_id,
            due: prev.due_date,
          };
        }
        const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert(payload);
        if (error) throw error;
      }
      if (triggerNext) {
        await generateNextAfterCompletion(triggerNext.table, triggerNext.sourceId, triggerNext.due);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Tarefa salva");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Tarefa removida");
    },
  });
};

// ---------- Goals ----------
export const useGoals = () =>
  useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("*").order("deadline", { nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useMilestones = (goalId?: string) =>
  useQuery({
    queryKey: ["milestones", goalId],
    queryFn: async () => {
      if (!goalId) return [];
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("goal_id", goalId)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!goalId,
  });

export const useUpsertGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal: any) => {
      if (goal.id) {
        const { data, error } = await supabase.from("goals").update(goal).eq("id", goal.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from("goals").insert(goal).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta salva");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta removida");
    },
  });
};

export const useUpsertMilestone = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: any) => {
      if (m.id) {
        const { error } = await supabase.from("milestones").update(m).eq("id", m.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("milestones").insert(m);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: ["milestones", vars.goal_id] });
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });
};

export const useDeleteMilestone = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: { id: string; goal_id: string }) => {
      const { error } = await supabase.from("milestones").delete().eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["milestones", vars.goal_id] });
    },
  });
};

// ---------- Transactions ----------
export const useTransactions = () =>
  useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: any) => {
      if (t.id) {
        const { error } = await supabase.from("transactions").update(t).eq("id", t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transactions").insert(t);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Removido");
    },
  });
};

export const useUpsertAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: any) => {
      if (a.id) {
        const { error } = await supabase.from("accounts").update(a).eq("id", a.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts").insert(a);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
    onError: (e: any) => toast.error(e.message),
  });
};

// ---------- Recurrences ----------
export const useRecurrences = () =>
  useQuery({
    queryKey: ["recurrences"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recurrences").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertRecurrence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: any) => {
      if (r.id) {
        const { error } = await supabase.from("recurrences").update(r).eq("id", r.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("recurrences").insert(r);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurrences"] }),
  });
};

export const useDeleteRecurrence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurrences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurrences"] }),
  });
};

// ---------- Backlog (Zero Procrastinação) ----------
export const useBacklogItems = (status = "pendente") =>
  useQuery({
    queryKey: ["backlog_items", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_items")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertBacklogItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: any) => {
      const { id, ...rest } = item;
      if (id) {
        const { error } = await supabase
          .from("backlog_items").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("backlog_items").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backlog_items"] }),
  });
};

export const useDeleteBacklogItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("backlog_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backlog_items"] }),
  });
};
