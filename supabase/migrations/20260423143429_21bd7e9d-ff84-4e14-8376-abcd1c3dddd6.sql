CREATE TABLE public.session_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'single',
  depth text NOT NULL DEFAULT 'estrategico',
  title text,
  transcript text NOT NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  session_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_analyses_patient ON public.session_analyses(patient_id, created_at DESC);

ALTER TABLE public.session_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.session_analyses FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER set_session_analyses_updated_at
BEFORE UPDATE ON public.session_analyses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();