-- content_projects: container central com memória viva
CREATE TABLE public.content_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  intent text,
  scope text NOT NULL DEFAULT 'profissional',
  current_stage integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'ativo',
  context jsonb NOT NULL DEFAULT '{
    "intent":"",
    "angle":"",
    "tone":"",
    "positioning":"",
    "audience":{"pains":[],"desires":[],"objections":[],"emotional_patterns":[]},
    "approved_assets":{"hooks":[],"metaphors":[],"examples":[],"phrases":[]},
    "rejected":{"hooks":[],"directions":[]},
    "narrative":{"arc":"","tension_points":[],"cta_type":""},
    "timing":{"target_seconds":60,"density":"medio"}
  }'::jsonb,
  source_idea_id uuid,
  linked_piece_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.content_projects
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER content_projects_set_updated_at
  BEFORE UPDATE ON public.content_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- content_project_stages: registro de cada estágio
CREATE TABLE public.content_project_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.content_projects(id) ON DELETE CASCADE,
  stage integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_reasoning text,
  user_decisions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_project_stages_project ON public.content_project_stages(project_id, stage);

ALTER TABLE public.content_project_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.content_project_stages
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER content_project_stages_set_updated_at
  BEFORE UPDATE ON public.content_project_stages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- content_project_versions: snapshots versionados
CREATE TABLE public.content_project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.content_projects(id) ON DELETE CASCADE,
  stage integer NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  diff_from_previous jsonb,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_project_versions_project ON public.content_project_versions(project_id, stage, created_at DESC);

ALTER TABLE public.content_project_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.content_project_versions
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);