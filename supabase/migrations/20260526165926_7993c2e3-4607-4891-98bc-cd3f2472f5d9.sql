ALTER TABLE public.content_pieces
ADD COLUMN IF NOT EXISTS energia text
CHECK (energia IS NULL OR energia IN ('topo','meio','fundo'));

ALTER TABLE public.content_ideas
ADD COLUMN IF NOT EXISTS energia text
CHECK (energia IS NULL OR energia IN ('topo','meio','fundo'));