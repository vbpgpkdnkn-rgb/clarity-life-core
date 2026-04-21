
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS target_finish_date date,
  ADD COLUMN IF NOT EXISTS pages_per_session integer,
  ADD COLUMN IF NOT EXISTS plan_notes text;

CREATE TABLE IF NOT EXISTS public.book_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'insight',
  content text NOT NULL,
  page_ref integer,
  sent_to_content boolean NOT NULL DEFAULT false,
  content_idea_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.book_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.book_notes FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS book_notes_book_id_idx ON public.book_notes(book_id);
