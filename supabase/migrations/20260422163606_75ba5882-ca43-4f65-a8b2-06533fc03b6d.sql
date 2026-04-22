-- Patients
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  birth_date date,
  external_ref text,
  default_session_price numeric DEFAULT 0,
  default_duration_minutes integer DEFAULT 50,
  status text NOT NULL DEFAULT 'ativo',
  notes text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.patients FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER patients_updated BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_patients_status ON public.patients(status);
CREATE INDEX idx_patients_name ON public.patients(name);

-- Therapy sessions
CREATE TABLE public.therapy_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  start_time time,
  duration_minutes integer DEFAULT 50,
  modality text DEFAULT 'online',
  status text NOT NULL DEFAULT 'agendada', -- agendada | realizada | cancelada | falta
  price numeric DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pendente', -- pendente | pago | isento
  payment_method text,
  paid_at date,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  chart_updated boolean NOT NULL DEFAULT false,
  chart_updated_at timestamptz,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.therapy_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.therapy_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER therapy_sessions_updated BEFORE UPDATE ON public.therapy_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_therapy_sessions_date ON public.therapy_sessions(date);
CREATE INDEX idx_therapy_sessions_patient ON public.therapy_sessions(patient_id);
CREATE INDEX idx_therapy_sessions_status ON public.therapy_sessions(status);
CREATE INDEX idx_therapy_sessions_payment ON public.therapy_sessions(payment_status);

-- Link tasks to patient and session (optional, for task→paciente integration)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS therapy_session_id uuid REFERENCES public.therapy_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_patient ON public.tasks(patient_id);