import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Scope = "pessoal" | "profissional";
export type TaskPriority = "alta" | "media" | "baixa";
export type TaskStatus = "pendente" | "em_andamento" | "concluida";
export type TxnType = "entrada" | "saida" | "transferencia";
export type TxnNature = "fixo" | "variavel";
export type TxnStatus = "conciliado" | "pendente";
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
  return accounts.map((a) => {
    let bal = Number(a.initial_balance || 0);
    for (const t of txns) {
      if (t.account_id === a.id) {
        if (t.type === "entrada") bal += Number(t.amount);
        else if (t.type === "saida") bal -= Number(t.amount);
        else if (t.type === "transferencia") bal -= Number(t.amount);
      }
      if (t.to_account_id === a.id && t.type === "transferencia") bal += Number(t.amount);
    }
    return { ...a, balance: bal };
  });
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
      if (task.id) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert(payload);
        if (error) throw error;
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
        const { error } = await supabase.from("goals").update(goal).eq("id", goal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("goals").insert(goal);
        if (error) throw error;
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
