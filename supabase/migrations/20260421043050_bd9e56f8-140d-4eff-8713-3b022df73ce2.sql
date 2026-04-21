-- 1. Tabela de snapshots semanais do Instagram
CREATE TABLE public.instagram_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope public.scope_type NOT NULL DEFAULT 'profissional',
  week_start DATE NOT NULL,
  followers INTEGER NOT NULL DEFAULT 0,
  followers_gained INTEGER NOT NULL DEFAULT 0,
  followers_lost INTEGER NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  profile_visits INTEGER NOT NULL DEFAULT 0,
  website_clicks INTEGER NOT NULL DEFAULT 0,
  dms_received INTEGER NOT NULL DEFAULT 0,
  appointments_booked INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope, week_start)
);

ALTER TABLE public.instagram_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.instagram_snapshots
FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_instagram_snapshots_updated_at
BEFORE UPDATE ON public.instagram_snapshots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_instagram_snapshots_week ON public.instagram_snapshots(scope, week_start DESC);

-- 2. Campos de captação por post
ALTER TABLE public.content_pieces
  ADD COLUMN generated_dms INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN booked_appointment BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN cta_type TEXT;

COMMENT ON COLUMN public.content_pieces.cta_type IS 'autoridade | dor | convite | educativo | bastidor | depoimento | outro';