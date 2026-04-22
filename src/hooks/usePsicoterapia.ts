import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PatientStatus = "ativo" | "pausado" | "alta" | "encerrado";
export type SessionStatus = "agendada" | "realizada" | "cancelada" | "falta";
export type PaymentStatus = "pendente" | "pago" | "isento";

// ---------- Patients ----------
export const usePatients = () =>
  useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const usePatient = (id?: string) =>
  useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

export const useUpsertPatient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: any) => {
      if (p.id) {
        const { error } = await supabase.from("patients").update(p).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("patients").insert(p);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Paciente salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeletePatient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["therapy_sessions"] });
      toast.success("Paciente removido");
    },
  });
};

// ---------- Therapy Sessions ----------
export const useTherapySessions = (filters?: { from?: string; to?: string; patient_id?: string }) =>
  useQuery({
    queryKey: ["therapy_sessions", filters],
    queryFn: async () => {
      let q = supabase.from("therapy_sessions").select("*");
      if (filters?.from) q = q.gte("date", filters.from);
      if (filters?.to) q = q.lte("date", filters.to);
      if (filters?.patient_id) q = q.eq("patient_id", filters.patient_id);
      q = q.order("date", { ascending: true }).order("start_time", { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertTherapySession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: any) => {
      // Carrega estado anterior para detectar transição em chart_updated
      let prev: any = null;
      if (s.id) {
        const { data } = await supabase
          .from("therapy_sessions")
          .select("chart_updated, chart_updated_at")
          .eq("id", s.id)
          .maybeSingle();
        prev = data;
      }

      const payload = { ...s };
      // Marca chart_updated_at quando passa a true
      if (payload.chart_updated && (!prev || !prev.chart_updated)) {
        payload.chart_updated_at = new Date().toISOString();
      }
      if (payload.chart_updated === false) {
        payload.chart_updated_at = null;
      }

      let savedId = s.id;
      if (s.id) {
        const { error } = await supabase.from("therapy_sessions").update(payload).eq("id", s.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("therapy_sessions").insert(payload).select("id").single();
        if (error) throw error;
        savedId = data.id;
      }

      return savedId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["therapy_sessions"] });
      toast.success("Sessão salva");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteTherapySession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("therapy_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["therapy_sessions"] });
      toast.success("Sessão removida");
    },
  });
};

// ---------- CSV Import ----------
/**
 * Parser tolerante de CSV de pacientes.
 * Tenta identificar colunas: nome, email, telefone, valor, observações.
 */
export function parsePatientsCSV(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [] as any[];
  const sep = (lines[0].match(/;/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? ";" : ",";

  const splitLine = (line: string) => {
    // simples; respeita aspas
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
      } else if (ch === sep && !inQ) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim().replace(/^"|"$/g, ""));
  };

  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  const findIdx = (...keys: string[]) =>
    header.findIndex((h) => keys.some((k) => h.includes(k)));

  const nameIdx = findIdx("nome", "name", "paciente");
  const emailIdx = findIdx("email", "e-mail");
  const phoneIdx = findIdx("telefone", "phone", "celular", "whats");
  const priceIdx = findIdx("valor", "preco", "price");
  const notesIdx = findIdx("obs", "notes", "observ");
  const refIdx = findIdx("id", "código", "codigo", "ref");
  const birthIdx = findIdx("nascimento", "birth", "dt_nasc");

  if (nameIdx === -1) return [];

  const out: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = splitLine(lines[i]);
    const name = parts[nameIdx];
    if (!name) continue;
    const priceRaw = priceIdx >= 0 ? (parts[priceIdx] || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".") : "";
    const price = priceRaw ? parseFloat(priceRaw) : 0;
    let birth: string | null = null;
    if (birthIdx >= 0 && parts[birthIdx]) {
      const b = parts[birthIdx];
      const dmy = b.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      birth = dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : b;
    }
    out.push({
      name,
      email: emailIdx >= 0 ? parts[emailIdx] || null : null,
      phone: phoneIdx >= 0 ? parts[phoneIdx] || null : null,
      birth_date: birth,
      default_session_price: price || 0,
      notes: notesIdx >= 0 ? parts[notesIdx] || null : null,
      external_ref: refIdx >= 0 ? parts[refIdx] || null : null,
      status: "ativo",
    });
  }
  return out;
}

// ---------- Agenda OCR ----------
export type ExtractedSession = {
  raw_name: string;
  matched_name: string | null;
  start_time: string | null;
  duration_minutes: number | null;
  modality: "online" | "presencial" | "hibrido" | null;
  status: "agendada" | "realizada" | "cancelada" | "falta";
  price: number | null;
  note: string | null;
};

export const useExtractAgenda = () =>
  useMutation({
    mutationFn: async (params: { image_data_url: string; date: string; patient_names: string[] }) => {
      const { data, error } = await supabase.functions.invoke("agenda-ocr", { body: params });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return ((data as any)?.sessions ?? []) as ExtractedSession[];
    },
  });

/** Tarefa para a próxima sessão (cria task com vencimento +7 dias). */
export const useCreateNextSessionTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      patient_id: string;
      title: string;
      session_date: string; // ISO da sessão atual; tarefa fica para +7 dias
      session_id?: string;
      notes?: string;
    }) => {
      const due = new Date(params.session_date + "T00:00:00");
      due.setDate(due.getDate() + 7);
      const dueISO = due.toISOString().slice(0, 10);
      const { error } = await supabase.from("tasks").insert({
        title: params.title,
        notes: params.notes ?? null,
        patient_id: params.patient_id,
        therapy_session_id: params.session_id ?? null,
        scope: "profissional",
        due_date: dueISO,
        priority: "media",
        status: "pendente",
      });
      if (error) throw error;
      return dueISO;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa criada para a próxima sessão");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useImportPatients = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: any[]) => {
      if (!rows.length) return 0;
      // upsert por external_ref quando existir; caso contrário insert simples
      let ok = 0;
      for (const r of rows) {
        try {
          if (r.external_ref) {
            const { data: existing } = await supabase
              .from("patients")
              .select("id")
              .eq("external_ref", r.external_ref)
              .maybeSingle();
            if (existing?.id) {
              await supabase.from("patients").update(r).eq("id", existing.id);
            } else {
              await supabase.from("patients").insert(r);
            }
          } else {
            await supabase.from("patients").insert(r);
          }
          ok++;
        } catch (e) {
          // pula linha problemática
        }
      }
      return ok;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success(`${count} pacientes importados`);
    },
    onError: (e: any) => toast.error(e.message),
  });
};
