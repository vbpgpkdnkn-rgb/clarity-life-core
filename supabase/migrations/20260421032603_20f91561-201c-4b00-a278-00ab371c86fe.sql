-- AI insights persistence
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  scope text NOT NULL DEFAULT 'todos',
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_date_scope ON public.ai_insights (date DESC, scope);
CREATE INDEX IF NOT EXISTS idx_ai_insights_kind ON public.ai_insights (kind);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.ai_insights
  FOR ALL USING (true) WITH CHECK (true);