
ALTER TABLE public.content_pieces
  ADD COLUMN IF NOT EXISTS performance_analysis jsonb,
  ADD COLUMN IF NOT EXISTS parent_piece_id uuid REFERENCES public.content_pieces(id) ON DELETE SET NULL;

ALTER TABLE public.content_metrics
  ADD COLUMN IF NOT EXISTS dms_recebidos integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agendamentos integer DEFAULT 0;
