-- Limpa sessão de teste
DELETE FROM public.therapy_sessions WHERE id = '111c2e7b-af8f-4cd5-b933-3c82528e1339';

-- Bucket privado para prints de agenda enviados pela secretária
INSERT INTO storage.buckets (id, name, public)
VALUES ('agenda-imports', 'agenda-imports', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas abertas (alinhado com o padrão do projeto sem auth)
CREATE POLICY "agenda imports read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agenda-imports');

CREATE POLICY "agenda imports insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'agenda-imports');

CREATE POLICY "agenda imports update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'agenda-imports');

CREATE POLICY "agenda imports delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'agenda-imports');

-- Histórico de importações de agenda
CREATE TABLE IF NOT EXISTS public.agenda_imports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  image_path text,
  sessions_created integer NOT NULL DEFAULT 0,
  raw_extraction jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agenda_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.agenda_imports FOR ALL USING (true) WITH CHECK (true);