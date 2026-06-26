
ALTER TABLE public.content_pieces
  ADD COLUMN IF NOT EXISTS pre_recording_notes TEXT,
  ADD COLUMN IF NOT EXISTS editing_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS editing_notes TEXT,
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_script TEXT,
  ADD COLUMN IF NOT EXISTS carousel_script TEXT,
  ADD COLUMN IF NOT EXISTS stories_script TEXT,
  ADD COLUMN IF NOT EXISTS debate_caption TEXT;
