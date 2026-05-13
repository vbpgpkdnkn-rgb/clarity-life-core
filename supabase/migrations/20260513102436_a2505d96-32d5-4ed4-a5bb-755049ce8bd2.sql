CREATE TABLE IF NOT EXISTS public.content_project_locks (
  project_id UUID PRIMARY KEY,
  current_operation TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_project_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.content_project_locks;
CREATE POLICY "authenticated_full_access"
ON public.content_project_locks
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS set_content_project_locks_updated_at ON public.content_project_locks;
CREATE TRIGGER set_content_project_locks_updated_at
BEFORE UPDATE ON public.content_project_locks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_content_project_locks_expires_at
ON public.content_project_locks (expires_at);