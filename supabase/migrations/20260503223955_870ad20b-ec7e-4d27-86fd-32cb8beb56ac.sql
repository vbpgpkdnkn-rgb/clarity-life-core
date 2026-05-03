
CREATE TABLE IF NOT EXISTS public.audience_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  title text,
  author text,
  angle text NOT NULL DEFAULT 'aprofundar',
  transcript text NOT NULL DEFAULT '',
  comments text NOT NULL DEFAULT '',
  my_perspective text NOT NULL DEFAULT '',
  patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  ideas jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.audience_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON public.audience_analyses
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER set_audience_analyses_updated_at
  BEFORE UPDATE ON public.audience_analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
