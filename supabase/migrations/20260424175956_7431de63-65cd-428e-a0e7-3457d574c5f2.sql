CREATE TABLE public.strategic_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'profissional',
  intent TEXT,
  trigger TEXT,
  conflict TEXT,
  hook TEXT,
  insight TEXT,
  cta TEXT,
  script TEXT,
  format TEXT,
  theme TEXT,
  decision JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  approved BOOLEAN NOT NULL DEFAULT false,
  saved_as_idea_id UUID,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access"
  ON public.strategic_scripts
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER set_strategic_scripts_updated_at
  BEFORE UPDATE ON public.strategic_scripts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_strategic_scripts_created ON public.strategic_scripts (created_at DESC);