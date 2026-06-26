
ALTER TABLE public.content_pieces
  ADD COLUMN IF NOT EXISTS ai_memory JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS teleprompter_font_size INTEGER NOT NULL DEFAULT 32;

CREATE TABLE IF NOT EXISTS public.script_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  structure JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.script_templates TO authenticated;
GRANT ALL ON public.script_templates TO service_role;

ALTER TABLE public.script_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own script templates"
  ON public.script_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER script_templates_set_updated_at
  BEFORE UPDATE ON public.script_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
