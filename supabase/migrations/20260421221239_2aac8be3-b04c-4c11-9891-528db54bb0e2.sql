
create table if not exists public.content_strategy (
  id uuid primary key default gen_random_uuid(),
  scope public.scope_type not null default 'profissional',
  niche text,
  icp text,
  offer text,
  tone text,
  pillars jsonb not null default '[]'::jsonb,
  goals text,
  forbidden_topics text,
  reference_brands text,
  signature_format text,
  posting_cadence text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_strategy enable row level security;
drop policy if exists "open all" on public.content_strategy;
create policy "open all" on public.content_strategy for all using (true) with check (true);

create unique index if not exists content_strategy_scope_uniq on public.content_strategy(scope);

drop trigger if exists content_strategy_set_updated_at on public.content_strategy;
create trigger content_strategy_set_updated_at
before update on public.content_strategy
for each row execute function public.set_updated_at();

alter table public.projects
  add column if not exists vision text,
  add column if not exists success_criteria text,
  add column if not exists stakeholders jsonb not null default '[]'::jsonb,
  add column if not exists risks jsonb not null default '[]'::jsonb,
  add column if not exists next_step text,
  add column if not exists budget numeric,
  add column if not exists kpis jsonb not null default '[]'::jsonb,
  add column if not exists milestones_text text;
