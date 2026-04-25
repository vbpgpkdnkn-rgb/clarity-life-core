ALTER TABLE public.content_ideas
ADD COLUMN IF NOT EXISTS idea_status text NOT NULL DEFAULT 'nova',
ADD COLUMN IF NOT EXISTS context text,
ADD COLUMN IF NOT EXISTS preferred_format text,
ADD COLUMN IF NOT EXISTS clinical_anchor text,
ADD COLUMN IF NOT EXISTS urgency text NOT NULL DEFAULT 'sem_pressa',
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_content_ideas_idea_status ON public.content_ideas (idea_status);
CREATE INDEX IF NOT EXISTS idx_content_ideas_urgency ON public.content_ideas (urgency);