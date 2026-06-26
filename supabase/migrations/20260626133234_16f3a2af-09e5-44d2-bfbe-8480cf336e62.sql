CREATE TABLE IF NOT EXISTS public.daily_story_plans (
  date date PRIMARY KEY,
  slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_story_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_story_plans TO anon;
GRANT ALL ON public.daily_story_plans TO service_role;

ALTER TABLE public.daily_story_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.daily_story_plans FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER set_daily_story_plans_updated_at
  BEFORE UPDATE ON public.daily_story_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();