
-- 1. Update transactions status enum: conciliado → pago, add 'futuro'
alter type public.txn_status rename to txn_status_old;
create type public.txn_status as enum ('pago', 'pendente', 'futuro');

alter table public.transactions
  alter column status drop default,
  alter column status type public.txn_status using (
    case status::text
      when 'conciliado' then 'pago'::public.txn_status
      when 'pendente' then 'pendente'::public.txn_status
      else 'pago'::public.txn_status
    end
  ),
  alter column status set default 'pago'::public.txn_status;

drop type public.txn_status_old;

-- 2. Add 'hibrida' to goal_kind enum
alter type public.goal_kind add value if not exists 'hibrida';

-- 3. Add hybrid goal fields
alter table public.goals
  add column if not exists target_tasks integer,
  add column if not exists weight_financial numeric(5,2) default 50,
  add column if not exists weight_tasks numeric(5,2) default 50;

-- 4. Helper function: balance of an account at a given date (only paid txns)
create or replace function public.account_balance(p_account uuid, p_until date default current_date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with acc as (select initial_balance from public.accounts where id = p_account)
  select
    (select initial_balance from acc)
    + coalesce((
        select sum(
          case
            when type = 'entrada' then amount
            when type = 'saida' then -amount
            when type = 'transferencia' and account_id = p_account then -amount
            else 0
          end
        )
        from public.transactions
        where status = 'pago'
          and date <= p_until
          and account_id = p_account
      ), 0)
    + coalesce((
        select sum(amount)
        from public.transactions
        where status = 'pago'
          and date <= p_until
          and type = 'transferencia'
          and to_account_id = p_account
      ), 0)
$$;
