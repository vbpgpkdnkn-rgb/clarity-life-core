
-- ===================== ENUMS =====================
CREATE TYPE public.life_area_kind AS ENUM (
  'carreira','financas','saude','relacionamentos','familia',
  'desenvolvimento','espiritualidade','lazer','contribuicao','ambiente'
);

CREATE TYPE public.project_status AS ENUM (
  'planejado','em_andamento','em_revisao','concluido','pausado','arquivado'
);

CREATE TYPE public.kanban_column AS ENUM ('todo','in_progress','review','done');

CREATE TYPE public.energy_level AS ENUM ('leve','media','pesada');

CREATE TYPE public.eisenhower_quadrant AS ENUM (
  'urgente_importante',
  'importante_nao_urgente',
  'urgente_nao_importante',
  'nao_urgente_nao_importante'
);

CREATE TYPE public.mood_level AS ENUM ('muito_baixo','baixo','neutro','alto','muito_alto');

CREATE TYPE public.challenge_status AS ENUM ('ativo','concluido','abandonado');

-- ===================== LIFE AREAS =====================
CREATE TABLE public.life_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.life_area_kind NOT NULL,
  name text NOT NULL,
  description text,
  color text,
  icon text,
  target_weight numeric DEFAULT 10,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.life_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.life_areas FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER set_life_areas_updated_at BEFORE UPDATE ON public.life_areas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default areas
INSERT INTO public.life_areas (kind, name, color, icon, position) VALUES
  ('carreira','Carreira','#8B7355','Briefcase',1),
  ('financas','Finanças','#5B7553','Wallet',2),
  ('saude','Saúde','#A85751','HeartPulse',3),
  ('relacionamentos','Relacionamentos','#C28A6A','Users',4),
  ('familia','Família','#946846','Home',5),
  ('desenvolvimento','Desenvolvimento','#6B7B8C','BookOpen',6),
  ('espiritualidade','Espiritualidade','#7A6E83','Sparkles',7),
  ('lazer','Lazer','#B89968','Palmtree',8),
  ('contribuicao','Contribuição','#7E8C5E','HandHeart',9),
  ('ambiente','Ambiente','#8A8270','Leaf',10);

-- ===================== PROJECTS =====================
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  area_id uuid REFERENCES public.life_areas(id) ON DELETE SET NULL,
  scope public.scope_type NOT NULL DEFAULT 'pessoal',
  status public.project_status NOT NULL DEFAULT 'planejado',
  priority public.task_priority NOT NULL DEFAULT 'media',
  start_date date,
  end_date date,
  deadline date,
  progress numeric NOT NULL DEFAULT 0,
  resources jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER set_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- OKRs por projeto
CREATE TABLE public.project_okrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  objective text NOT NULL,
  key_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_okrs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.project_okrs FOR ALL USING (true) WITH CHECK (true);

-- ===================== Adições a tabelas existentes =====================
ALTER TABLE public.goals ADD COLUMN area_id uuid REFERENCES public.life_areas(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN area_id uuid REFERENCES public.life_areas(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN energy public.energy_level;
ALTER TABLE public.tasks ADD COLUMN eisenhower public.eisenhower_quadrant;
ALTER TABLE public.tasks ADD COLUMN kanban_column public.kanban_column NOT NULL DEFAULT 'todo';
ALTER TABLE public.tasks ADD COLUMN is_135 text; -- 'big' | 'medium' | 'small'
ALTER TABLE public.habits ADD COLUMN area_id uuid REFERENCES public.life_areas(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN area_id uuid REFERENCES public.life_areas(id) ON DELETE SET NULL;

-- ===================== BRAIN DUMP =====================
CREATE TABLE public.brain_dump_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  converted_to text, -- 'task' | 'goal' | 'project' | 'note' | 'discarded'
  converted_id uuid,
  area_id uuid REFERENCES public.life_areas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brain_dump_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.brain_dump_items FOR ALL USING (true) WITH CHECK (true);

-- ===================== GRATIDÃO + CHECK-IN EMOCIONAL =====================
CREATE TABLE public.gratitude_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb, -- ["...", "...", "..."]
  tiny_joys jsonb NOT NULL DEFAULT '[]'::jsonb,
  reflection text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(date)
);
ALTER TABLE public.gratitude_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.gratitude_entries FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  mood public.mood_level NOT NULL DEFAULT 'neutro',
  energy public.mood_level NOT NULL DEFAULT 'neutro',
  stress public.mood_level NOT NULL DEFAULT 'neutro',
  sleep_hours numeric,
  what_went_well jsonb NOT NULL DEFAULT '[]'::jsonb,
  what_struggled jsonb NOT NULL DEFAULT '[]'::jsonb,
  noticed text,
  day_rating integer CHECK (day_rating BETWEEN 1 AND 5),
  for_tomorrow text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(date)
);
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.daily_checkins FOR ALL USING (true) WITH CHECK (true);

-- ===================== FOCUS / POMODORO SESSIONS =====================
CREATE TABLE public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  planned_minutes integer NOT NULL DEFAULT 25,
  actual_minutes integer,
  kind text NOT NULL DEFAULT 'pomodoro', -- 'pomodoro' | 'deep_work'
  notes text,
  interruptions integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.focus_sessions FOR ALL USING (true) WITH CHECK (true);

-- ===================== VIDA PRÁTICA =====================
CREATE TABLE public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  breakfast text,
  lunch text,
  snack text,
  dinner text,
  notes text,
  shopping_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(date)
);
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.meal_plans FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER set_meal_plans_updated_at BEFORE UPDATE ON public.meal_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cleaning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  frequency text NOT NULL DEFAULT 'semanal', -- 'diaria','semanal','quinzenal','mensal'
  area text, -- cozinha, banheiro, quarto, sala, lavanderia, área externa
  last_done date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cleaning_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.cleaning_tasks FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.cleaning_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaning_task_id uuid NOT NULL REFERENCES public.cleaning_tasks(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cleaning_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.cleaning_logs FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text, -- 'compra','experiencia','viagem','presente','outro'
  estimated_price numeric,
  priority public.task_priority NOT NULL DEFAULT 'media',
  url text,
  notes text,
  acquired boolean NOT NULL DEFAULT false,
  acquired_at timestamptz,
  area_id uuid REFERENCES public.life_areas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.wishlist_items FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  status text NOT NULL DEFAULT 'quero_ler', -- 'quero_ler','lendo','lido','abandonado'
  rating integer CHECK (rating BETWEEN 1 AND 5),
  started_at date,
  finished_at date,
  pages integer,
  current_page integer DEFAULT 0,
  cover_url text,
  summary text,
  favorite_quotes jsonb NOT NULL DEFAULT '[]'::jsonb,
  takeaways text,
  recommend boolean,
  area_id uuid REFERENCES public.life_areas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.books FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER set_books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===================== DESAFIOS =====================
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_days integer NOT NULL DEFAULT 30,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status public.challenge_status NOT NULL DEFAULT 'ativo',
  area_id uuid REFERENCES public.life_areas(id) ON DELETE SET NULL,
  daily_action text,
  reward text,
  reflection text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.challenges FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER set_challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.challenge_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  done boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, date)
);
ALTER TABLE public.challenge_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.challenge_logs FOR ALL USING (true) WITH CHECK (true);

-- ===================== DREAMBOARD =====================
CREATE TABLE public.dreamboard_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  category text, -- 'goal','dream','vision','affirmation'
  area_id uuid REFERENCES public.life_areas(id) ON DELETE SET NULL,
  goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  achieved boolean NOT NULL DEFAULT false,
  achieved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dreamboard_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open all" ON public.dreamboard_items FOR ALL USING (true) WITH CHECK (true);

-- ===================== ÍNDICES =====================
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_area_id ON public.tasks(area_id);
CREATE INDEX idx_tasks_kanban ON public.tasks(kanban_column);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_projects_goal_id ON public.projects(goal_id);
CREATE INDEX idx_projects_area_id ON public.projects(area_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_focus_sessions_task ON public.focus_sessions(task_id);
CREATE INDEX idx_challenge_logs_challenge ON public.challenge_logs(challenge_id, date);
CREATE INDEX idx_brain_dump_processed ON public.brain_dump_items(processed);
