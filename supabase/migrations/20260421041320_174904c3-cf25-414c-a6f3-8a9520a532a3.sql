-- Enum para slots de stories
DO $$ BEGIN
  CREATE TYPE public.story_slot AS ENUM ('bastidores','rotina','pergunta','interacao','reflexao','dica','divulgacao','outro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tabela de stories diários
CREATE TABLE IF NOT EXISTS public.content_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  slot public.story_slot NOT NULL DEFAULT 'outro',
  title text NOT NULL,
  description text,
  scope public.scope_type NOT NULL DEFAULT 'profissional',
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_stories_date ON public.content_stories(date);
ALTER TABLE public.content_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.content_stories FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_content_stories_updated
BEFORE UPDATE ON public.content_stories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tabela de referências (posts de referência analisados pela IA)
CREATE TABLE IF NOT EXISTS public.content_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text text,
  source_url text,
  source_author text,
  scope public.scope_type NOT NULL DEFAULT 'profissional',
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  adapted_title text,
  adapted_format public.content_format,
  adapted_hook text,
  adapted_outline text,
  used boolean NOT NULL DEFAULT false,
  piece_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_references_created ON public.content_references(created_at DESC);
ALTER TABLE public.content_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.content_references FOR ALL USING (true) WITH CHECK (true);