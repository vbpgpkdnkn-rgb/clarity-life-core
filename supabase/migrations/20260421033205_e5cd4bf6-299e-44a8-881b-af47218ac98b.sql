-- Adiciona prazo ao micro-objetivo (etapa)
ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS deadline date;

-- Vincula tarefa a uma etapa específica
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON public.tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON public.tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON public.milestones(goal_id);