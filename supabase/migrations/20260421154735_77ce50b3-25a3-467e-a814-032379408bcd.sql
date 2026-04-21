-- Recorrência por dias da semana em itens da Vida
ALTER TABLE public.cleaning_tasks
  ADD COLUMN IF NOT EXISTS weekdays integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS time_of_day time,
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.life_areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS weekdays integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS time_of_day time;

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS weekdays integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS time_of_day time;

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS weekdays integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS time_of_day time,
  ADD COLUMN IF NOT EXISTS session_minutes integer;

-- Origem da tarefa recorrente (para regenerar/limpar sem duplicar)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence_source_table text,
  ADD COLUMN IF NOT EXISTS recurrence_source_id uuid;

CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_source
  ON public.tasks (recurrence_source_table, recurrence_source_id, due_date);