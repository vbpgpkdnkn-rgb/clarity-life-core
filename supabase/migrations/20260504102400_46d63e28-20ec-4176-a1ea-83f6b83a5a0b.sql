-- Chats de refinamento de ideia
CREATE TABLE public.idea_refinement_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES public.audience_analyses(id) ON DELETE CASCADE,
  idea_index integer,
  idea_title text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  refined_idea jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.idea_refinement_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON public.idea_refinement_chats
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER set_updated_at_idea_refinement_chats
  BEFORE UPDATE ON public.idea_refinement_chats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Linha editorial semanal
CREATE TABLE public.editorial_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL UNIQUE,
  scope text NOT NULL DEFAULT 'profissional',
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.editorial_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON public.editorial_lines
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER set_updated_at_editorial_lines
  BEFORE UPDATE ON public.editorial_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sequências de stories
CREATE TABLE public.content_story_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id uuid REFERENCES public.content_pieces(id) ON DELETE SET NULL,
  theme text,
  objective text NOT NULL DEFAULT 'aprofundar',
  tone text NOT NULL DEFAULT 'mesmo',
  stories jsonb NOT NULL DEFAULT '[]'::jsonb,
  scheduled_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_story_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON public.content_story_sequences
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER set_updated_at_content_story_sequences
  BEFORE UPDATE ON public.content_story_sequences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();