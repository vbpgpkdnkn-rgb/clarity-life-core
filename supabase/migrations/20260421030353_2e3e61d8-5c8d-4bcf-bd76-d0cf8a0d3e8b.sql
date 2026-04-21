-- ============ EVENTS ============
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  scope public.scope_type NOT NULL DEFAULT 'pessoal',
  color TEXT,
  all_day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_date ON public.events(date);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.events FOR ALL USING (true) WITH CHECK (true);

-- ============ HABITS ============
CREATE TYPE public.habit_frequency AS ENUM ('diaria', 'semanal');

CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  scope public.scope_type NOT NULL DEFAULT 'pessoal',
  frequency public.habit_frequency NOT NULL DEFAULT 'diaria',
  target_value NUMERIC,           -- ex: 2 (litros), 30 (min). null = check simples
  unit TEXT,                       -- ex: 'L', 'min', 'pag'
  target_per_week INTEGER,         -- p/ frequência semanal: quantas vezes
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  color TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.habits FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  done BOOLEAN NOT NULL DEFAULT true,
  value NUMERIC,                   -- p/ hábitos quantitativos
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, date)
);
CREATE INDEX idx_habit_logs_date ON public.habit_logs(date);
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.habit_logs FOR ALL USING (true) WITH CHECK (true);

-- ============ WEEKLY PLAN ============
CREATE TABLE public.weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,        -- segunda-feira da semana
  focus TEXT,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,    -- array de strings (até 5)
  priorities JSONB NOT NULL DEFAULT '[]'::jsonb,    -- [{text, goal_id?, done}]
  balance_personal TEXT,
  balance_professional TEXT,
  balance_health TEXT,
  balance_financial TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.weekly_plans FOR ALL USING (true) WITH CHECK (true);

-- ============ DAILY PLAN ============
CREATE TABLE public.daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  top_priorities JSONB NOT NULL DEFAULT '[]'::jsonb, -- até 3 strings
  notes_rich TEXT,                                    -- HTML rich text
  notes_drawing TEXT,                                 -- data URL do canvas
  reflection TEXT,                                    -- como foi o dia
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.daily_plans FOR ALL USING (true) WITH CHECK (true);

-- ============ WEEKLY REVIEW ============
CREATE TABLE public.weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  what_worked TEXT,
  what_didnt TEXT,
  biggest_lesson TEXT,
  biggest_mistake TEXT,
  rating INTEGER CHECK (rating >= 0 AND rating <= 10),
  productivity INTEGER CHECK (productivity >= 0 AND productivity <= 100),
  consistency INTEGER CHECK (consistency >= 0 AND consistency <= 100),
  next_week_changes TEXT,
  important_decisions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.weekly_reviews FOR ALL USING (true) WITH CHECK (true);

-- ============ FREE NOTES ============
CREATE TABLE public.free_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content_rich TEXT,
  content_drawing TEXT,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.free_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.free_notes FOR ALL USING (true) WITH CHECK (true);

-- ============ TIMESTAMP TRIGGERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_weekly_plans_updated BEFORE UPDATE ON public.weekly_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_daily_plans_updated BEFORE UPDATE ON public.daily_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_weekly_reviews_updated BEFORE UPDATE ON public.weekly_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_free_notes_updated BEFORE UPDATE ON public.free_notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();