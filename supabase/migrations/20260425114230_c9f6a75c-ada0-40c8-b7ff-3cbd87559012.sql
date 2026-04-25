ALTER TABLE public.content_pieces
ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'roteiro_pronto',
ADD COLUMN IF NOT EXISTS clinical_anchor text,
ADD COLUMN IF NOT EXISTS audience_context text,
ADD COLUMN IF NOT EXISTS production_notes text,
ADD COLUMN IF NOT EXISTS target_publish_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS saves integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointments_booked integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_content_pieces_pipeline_stage ON public.content_pieces (pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_content_pieces_target_publish_at ON public.content_pieces (target_publish_at);