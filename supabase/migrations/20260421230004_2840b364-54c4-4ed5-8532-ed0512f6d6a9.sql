CREATE TABLE public.focus_pins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  icon TEXT,
  link TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (source_table, source_id)
);

ALTER TABLE public.focus_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.focus_pins FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_focus_pins_position ON public.focus_pins(position);