-- Enums
CREATE TYPE public.content_status AS ENUM ('ideia', 'em_producao', 'pronto', 'publicado', 'arquivado');
CREATE TYPE public.content_format AS ENUM ('reels', 'carrossel', 'texto', 'stories', 'video', 'podcast', 'newsletter');

-- Adiciona 'conteudo' ao enum goal_kind
ALTER TYPE public.goal_kind ADD VALUE IF NOT EXISTS 'conteudo';

-- Tabela: content_ideas (captura rápida)
CREATE TABLE public.content_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  theme TEXT,
  scope public.scope_type NOT NULL DEFAULT 'profissional',
  suggested_format public.content_format,
  notes TEXT,
  source TEXT,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.content_ideas FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_content_ideas_scope ON public.content_ideas(scope);
CREATE INDEX idx_content_ideas_used ON public.content_ideas(used);

-- Tabela: content_pieces (peça editorial)
CREATE TABLE public.content_pieces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  theme TEXT,
  format public.content_format NOT NULL DEFAULT 'reels',
  platform TEXT,
  status public.content_status NOT NULL DEFAULT 'ideia',
  scope public.scope_type NOT NULL DEFAULT 'profissional',
  planned_date DATE,
  published_at DATE,
  script TEXT,
  hook TEXT,
  cta TEXT,
  notes TEXT,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  idea_id UUID REFERENCES public.content_ideas(id) ON DELETE SET NULL,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  priority public.task_priority NOT NULL DEFAULT 'media',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.content_pieces FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_content_pieces_status ON public.content_pieces(status);
CREATE INDEX idx_content_pieces_scope ON public.content_pieces(scope);
CREATE INDEX idx_content_pieces_planned ON public.content_pieces(planned_date);
CREATE INDEX idx_content_pieces_published ON public.content_pieces(published_at);

CREATE TRIGGER trg_content_pieces_updated_at
  BEFORE UPDATE ON public.content_pieces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Adiciona referência opcional de tasks para content_pieces
ALTER TABLE public.tasks ADD COLUMN content_piece_id UUID REFERENCES public.content_pieces(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_content_piece ON public.tasks(content_piece_id);

-- Tabela: content_metrics
CREATE TABLE public.content_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  piece_id UUID NOT NULL REFERENCES public.content_pieces(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.content_metrics FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_content_metrics_piece ON public.content_metrics(piece_id);
CREATE INDEX idx_content_metrics_measured ON public.content_metrics(measured_at);