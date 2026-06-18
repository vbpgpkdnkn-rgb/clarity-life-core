CREATE TABLE IF NOT EXISTS public.backlog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  notes TEXT,
  last_drawn_at DATE,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'concluida', 'arquivada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backlog_items TO authenticated, anon;
GRANT ALL ON public.backlog_items TO service_role;

ALTER TABLE public.backlog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.backlog_items
  FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER set_backlog_items_updated_at
  BEFORE UPDATE ON public.backlog_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();