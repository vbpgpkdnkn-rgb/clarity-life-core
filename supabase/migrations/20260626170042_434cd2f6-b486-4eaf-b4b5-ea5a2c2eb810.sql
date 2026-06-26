CREATE TABLE public.content_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  total_episodes_planned INTEGER,
  instagram_url TEXT,
  status TEXT NOT NULL DEFAULT 'ativa',
  started_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_series TO authenticated, anon;
GRANT ALL ON public.content_series TO service_role;

ALTER TABLE public.content_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.content_series FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER content_series_updated_at
BEFORE UPDATE ON public.content_series
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();