-- 1) Perfil de performance semanal calculado pela IA
CREATE TABLE public.performance_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  week_start date NOT NULL,
  scope text NOT NULL DEFAULT 'todos',
  window_days integer NOT NULL DEFAULT 7,
  -- classificação dinâmica
  profile text NOT NULL CHECK (profile IN ('alta','media','baixa','inconsistente')),
  -- métricas brutas (0..1 ou 0..100 dependendo do campo)
  execution_rate numeric NOT NULL DEFAULT 0,        -- % concluídas / planejadas
  consistency_score numeric NOT NULL DEFAULT 0,     -- 0..100, dias produtivos seguidos
  overload_score numeric NOT NULL DEFAULT 0,        -- 0..100, sobrecarga detectada
  abandonment_rate numeric NOT NULL DEFAULT 0,      -- % tarefas adiadas/abandonadas
  productive_days integer NOT NULL DEFAULT 0,
  unproductive_days integer NOT NULL DEFAULT 0,
  avg_tasks_per_day numeric NOT NULL DEFAULT 0,
  recommended_load integer NOT NULL DEFAULT 3,      -- carga diária sugerida
  insights jsonb NOT NULL DEFAULT '{}'::jsonb,      -- patterns detectados, picos, etc
  narrative text                                     -- texto curto de feedback ("Sua execução caiu...")
);

ALTER TABLE public.performance_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.performance_profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_perf_profiles_week_scope
  ON public.performance_profiles(week_start DESC, scope);

-- garante 1 perfil por (semana, escopo, janela)
CREATE UNIQUE INDEX uq_perf_profiles_week_scope_window
  ON public.performance_profiles(week_start, scope, window_days);


-- 2) Ajustes sugeridos pela IA
CREATE TABLE public.performance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  scope text NOT NULL DEFAULT 'todos',
  area text NOT NULL CHECK (area IN ('carga','meta','foco','financeiro')),
  goal_id uuid REFERENCES public.goals(id) ON DELETE CASCADE,
  kind text NOT NULL,                               -- 'reduzir_carga','aumentar_carga','adiar_prazo','cortar_escopo','ajuste_foco', etc
  status text NOT NULL DEFAULT 'sugerido' CHECK (status IN ('sugerido','aceito','rejeitado','expirado')),
  rationale text NOT NULL,                          -- por que a IA sugere
  payload jsonb NOT NULL DEFAULT '{}'::jsonb        -- detalhes: {from:5, to:3} / {new_deadline:'...'} / {drop_task_ids:[...]}
);

ALTER TABLE public.performance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.performance_adjustments
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_perf_adj_recent
  ON public.performance_adjustments(created_at DESC, area, scope);
CREATE INDEX idx_perf_adj_goal
  ON public.performance_adjustments(goal_id);


-- 3) Trava manual em metas
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;


-- 4) Tempo estimado/médio de execução em tarefas
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS execution_minutes integer;