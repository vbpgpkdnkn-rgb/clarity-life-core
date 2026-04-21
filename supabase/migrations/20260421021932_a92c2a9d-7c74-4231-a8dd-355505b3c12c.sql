
-- Enums
create type public.scope_type as enum ('pessoal', 'profissional');
create type public.task_priority as enum ('alta', 'media', 'baixa');
create type public.task_status as enum ('pendente', 'em_andamento', 'concluida');
create type public.txn_type as enum ('entrada', 'saida', 'transferencia');
create type public.txn_nature as enum ('fixo', 'variavel');
create type public.txn_status as enum ('conciliado', 'pendente');
create type public.goal_status as enum ('ativa', 'concluida', 'pausada');
create type public.goal_kind as enum ('tarefas', 'financeiro', 'marcos');
create type public.recurrence_freq as enum ('diaria', 'semanal', 'mensal', 'anual');

-- Categories (transactions + tasks)
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope scope_type not null default 'pessoal',
  kind text not null default 'transaction', -- 'transaction' or 'task'
  color text,
  created_at timestamptz not null default now()
);

-- Bank accounts
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope scope_type not null default 'pessoal',
  initial_balance numeric(14,2) not null default 0,
  color text,
  created_at timestamptz not null default now()
);

-- Goals
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  scope scope_type not null default 'pessoal',
  kind goal_kind not null default 'tarefas',
  target_value numeric(14,2),
  current_value numeric(14,2) default 0,
  deadline date,
  status goal_status not null default 'ativa',
  created_at timestamptz not null default now()
);

-- Milestones for goals
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  name text not null,
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  scope scope_type not null default 'pessoal',
  priority task_priority not null default 'media',
  status task_status not null default 'pendente',
  due_date date,
  category_id uuid references public.categories(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  to_account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  type txn_type not null,
  nature txn_nature not null default 'variavel',
  scope scope_type not null default 'pessoal',
  amount numeric(14,2) not null,
  description text,
  date date not null default current_date,
  status txn_status not null default 'conciliado',
  external_ref text,
  created_at timestamptz not null default now()
);

-- Recurrences
create table public.recurrences (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  type txn_type not null,
  scope scope_type not null default 'pessoal',
  amount numeric(14,2) not null,
  description text not null,
  frequency recurrence_freq not null default 'mensal',
  day_of_month int,
  start_date date not null default current_date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS: single-user app, allow all (no auth in v1)
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.transactions enable row level security;
alter table public.recurrences enable row level security;

create policy "open all" on public.categories for all using (true) with check (true);
create policy "open all" on public.accounts for all using (true) with check (true);
create policy "open all" on public.goals for all using (true) with check (true);
create policy "open all" on public.milestones for all using (true) with check (true);
create policy "open all" on public.tasks for all using (true) with check (true);
create policy "open all" on public.transactions for all using (true) with check (true);
create policy "open all" on public.recurrences for all using (true) with check (true);

-- Indexes
create index on public.transactions(date);
create index on public.transactions(account_id);
create index on public.tasks(due_date);
create index on public.tasks(status);

-- Seed defaults
insert into public.accounts (name, scope, initial_balance, color) values
  ('Conta Pessoal', 'pessoal', 0, 'amber'),
  ('Conta Profissional', 'profissional', 0, 'slate');

insert into public.categories (name, scope, kind, color) values
  ('Salário', 'pessoal', 'transaction', 'green'),
  ('Alimentação', 'pessoal', 'transaction', 'amber'),
  ('Moradia', 'pessoal', 'transaction', 'rose'),
  ('Transporte', 'pessoal', 'transaction', 'blue'),
  ('Lazer', 'pessoal', 'transaction', 'violet'),
  ('Receita de Cliente', 'profissional', 'transaction', 'emerald'),
  ('Ferramentas', 'profissional', 'transaction', 'sky'),
  ('Impostos', 'profissional', 'transaction', 'red'),
  ('Pessoal', 'pessoal', 'task', 'amber'),
  ('Trabalho', 'profissional', 'task', 'slate');
