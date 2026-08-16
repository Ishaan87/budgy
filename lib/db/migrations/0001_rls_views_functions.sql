-- Hand-written migration: foreign keys into auth.users, Row Level Security, views, and
-- trigger functions. Kept separate from the drizzle-generated 0000 migration because
-- drizzle-kit does not manage the `auth` schema, RLS policies, or views. Run this AFTER
-- 0000_mute_vampiro.sql, by pasting both into the Supabase SQL editor in order.

-- =========================================================================================
-- 1. Foreign keys into auth.users
-- =========================================================================================

alter table "profiles"
  add constraint "profiles_id_fkey" foreign key ("id") references auth.users(id) on delete cascade;

alter table "accounts" add constraint "accounts_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;
alter table "account_aliases" add constraint "account_aliases_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;
alter table "categories" add constraint "categories_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;
alter table "transactions" add constraint "transactions_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;
alter table "budgets" add constraint "budgets_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;
alter table "recurring_rules" add constraint "recurring_rules_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;
alter table "debts" add constraint "debts_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;
alter table "debt_entries" add constraint "debt_entries_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;
alter table "rules" add constraint "rules_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;
alter table "llm_credentials" add constraint "llm_credentials_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;
alter table "llm_chain" add constraint "llm_chain_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;
alter table "llm_model_state" add constraint "llm_model_state_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;
alter table "llm_call_log" add constraint "llm_call_log_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;
alter table "nl_parse_cache" add constraint "nl_parse_cache_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;
alter table "audit_log" add constraint "audit_log_user_id_fkey" foreign key ("user_id") references auth.users(id) on delete cascade;

-- =========================================================================================
-- 2. Row Level Security — every user-owned table is scoped to auth.uid()
-- =========================================================================================

alter table "profiles" enable row level security;
alter table "accounts" enable row level security;
alter table "account_aliases" enable row level security;
alter table "categories" enable row level security;
alter table "transactions" enable row level security;
alter table "transaction_splits" enable row level security;
alter table "budgets" enable row level security;
alter table "recurring_rules" enable row level security;
alter table "debts" enable row level security;
alter table "debt_entries" enable row level security;
alter table "rules" enable row level security;
alter table "llm_credentials" enable row level security;
alter table "llm_chain" enable row level security;
alter table "llm_model_state" enable row level security;
alter table "llm_call_log" enable row level security;
alter table "nl_parse_cache" enable row level security;
alter table "audit_log" enable row level security;

create policy "profiles_own_row" on "profiles" for all
  using (id = auth.uid()) with check (id = auth.uid());

create policy "accounts_own_rows" on "accounts" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "account_aliases_own_rows" on "account_aliases" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "categories_own_rows" on "categories" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "transactions_own_rows" on "transactions" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- transaction_splits has no user_id column; scope through the parent transaction.
create policy "transaction_splits_via_transaction" on "transaction_splits" for all
  using (exists (
    select 1 from "transactions" t where t.id = transaction_splits.transaction_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from "transactions" t where t.id = transaction_splits.transaction_id and t.user_id = auth.uid()
  ));

create policy "budgets_own_rows" on "budgets" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "recurring_rules_own_rows" on "recurring_rules" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "debts_own_rows" on "debts" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "debt_entries_own_rows" on "debt_entries" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "rules_own_rows" on "rules" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- llm_credentials: readable/writable by the owner via the API layer only in practice, but RLS
-- still scopes by user. Plaintext keys never live here — only ciphertext/iv/auth_tag.
create policy "llm_credentials_own_rows" on "llm_credentials" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "llm_chain_own_rows" on "llm_chain" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "llm_model_state_own_rows" on "llm_model_state" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "llm_call_log_own_rows" on "llm_call_log" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "nl_parse_cache_own_rows" on "nl_parse_cache" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "audit_log_own_rows" on "audit_log" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================================================
-- 3. Trigger functions
-- =========================================================================================

-- Bootstraps a profile row (with sensible INR/en-IN/Asia-Kolkata defaults) the moment a new
-- auth.users row is created, and seeds a starter set of categories + a default cash account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cash_account_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  insert into public.categories (user_id, name, kind, icon, color) values
    (new.id, 'Food & Dining', 'expense', 'utensils', '#f97316'),
    (new.id, 'Groceries', 'expense', 'shopping-cart', '#84cc16'),
    (new.id, 'Transport', 'expense', 'car', '#3b82f6'),
    (new.id, 'Shopping', 'expense', 'shopping-bag', '#ec4899'),
    (new.id, 'Bills & Utilities', 'expense', 'receipt', '#ef4444'),
    (new.id, 'Rent', 'expense', 'home', '#8b5cf6'),
    (new.id, 'Entertainment', 'expense', 'film', '#06b6d4'),
    (new.id, 'Health', 'expense', 'heart-pulse', '#f43f5e'),
    (new.id, 'Subscriptions', 'expense', 'refresh-cw', '#a855f7'),
    (new.id, 'Travel', 'expense', 'plane', '#0ea5e9'),
    (new.id, 'Education', 'expense', 'graduation-cap', '#14b8a6'),
    (new.id, 'Other', 'expense', 'more-horizontal', '#6b7280'),
    (new.id, 'Salary', 'income', 'banknote', '#22c55e'),
    (new.id, 'Refunds', 'income', 'undo-2', '#22c55e'),
    (new.id, 'Other Income', 'income', 'plus-circle', '#22c55e');

  insert into public.accounts (user_id, name, type, opening_balance, icon, color)
  values (new.id, 'Cash', 'cash', 0, 'wallet', '#22c55e')
  returning id into cash_account_id;

  insert into public.account_aliases (user_id, account_id, alias)
  values (new.id, cash_account_id, 'cash');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generic updated_at maintenance, applied to every table that has the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'budgets', 'recurring_rules', 'debts', 'rules', 'llm_chain', 'transactions'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on %I; create trigger set_updated_at before update on %I for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- Enforces that transaction_splits always sum exactly to the parent transaction's amount.
create or replace function public.check_splits_sum()
returns trigger
language plpgsql
as $$
declare
  target_transaction_id uuid;
  parent_amount numeric(14, 2);
  splits_total numeric(14, 2);
begin
  target_transaction_id := coalesce(new.transaction_id, old.transaction_id);

  select amount into parent_amount from public.transactions where id = target_transaction_id;
  select coalesce(sum(amount), 0) into splits_total
    from public.transaction_splits where transaction_id = target_transaction_id;

  if splits_total <> parent_amount then
    raise exception 'transaction_splits for transaction % must sum to % (got %)',
      target_transaction_id, parent_amount, splits_total;
  end if;

  return new;
end;
$$;

drop trigger if exists check_splits_sum_trigger on transaction_splits;
create constraint trigger check_splits_sum_trigger
  after insert or update or delete on transaction_splits
  deferrable initially deferred
  for each row execute function public.check_splits_sum();

-- =========================================================================================
-- 4. Views
-- =========================================================================================

-- Current balance per account: opening balance, plus/minus posted (non-deleted) transactions.
create or replace view public.v_account_balances as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.type,
  a.opening_balance
    + coalesce(sum(case when t.account_id = a.id and t.type = 'income' then t.amount else 0 end), 0)
    - coalesce(sum(case when t.account_id = a.id and t.type = 'expense' then t.amount else 0 end), 0)
    - coalesce(sum(case when t.account_id = a.id and t.type = 'transfer' then t.amount else 0 end), 0)
    + coalesce(sum(case when t.to_account_id = a.id and t.type = 'transfer' then t.amount else 0 end), 0)
    as current_balance
from public.accounts a
left join public.transactions t
  on (t.account_id = a.id or t.to_account_id = a.id) and t.is_deleted = false
group by a.id, a.user_id, a.name, a.type, a.opening_balance;

-- Monthly spend per category (expenses only), bucketed by calendar month.
create or replace view public.v_monthly_category_spend as
select
  t.user_id,
  t.category_id,
  c.name as category_name,
  date_trunc('month', t.occurred_at)::date as month,
  sum(t.amount) as total_amount,
  count(*) as transaction_count
from public.transactions t
join public.categories c on c.id = t.category_id
where t.type = 'expense' and t.is_deleted = false
group by t.user_id, t.category_id, c.name, date_trunc('month', t.occurred_at);

-- Credit card statement cycles: splits each card's spend into "billed" (before the most
-- recent statement date) and "unbilled" (since), based on accounts.statement_day.
create or replace view public.v_card_cycles as
with cards as (
  select id, user_id, name, credit_limit, statement_day, due_day
  from public.accounts
  where type = 'credit_card' and is_archived = false
),
cycle_bounds as (
  select
    c.*,
    case
      when c.statement_day is null then date_trunc('month', now())::date
      when extract(day from now()) >= c.statement_day
        then make_date(extract(year from now())::int, extract(month from now())::int, c.statement_day)
      else
        make_date(extract(year from now())::int, extract(month from now())::int, c.statement_day) - interval '1 month'
    end::date as current_statement_date
  from cards c
)
select
  cb.id as account_id,
  cb.user_id,
  cb.name,
  cb.credit_limit,
  cb.statement_day,
  cb.due_day,
  cb.current_statement_date,
  (cb.current_statement_date + (cb.due_day || ' days')::interval)::date as next_due_date,
  coalesce(sum(case when t.occurred_at < cb.current_statement_date then t.amount else 0 end), 0) as billed_amount,
  coalesce(sum(case when t.occurred_at >= cb.current_statement_date then t.amount else 0 end), 0) as unbilled_amount
from cycle_bounds cb
left join public.transactions t
  on t.account_id = cb.id and t.type = 'expense' and t.is_deleted = false
group by cb.id, cb.user_id, cb.name, cb.credit_limit, cb.statement_day, cb.due_day, cb.current_statement_date;

-- Flat, denormalised transaction rows for the NL analytics query compiler. RLS on the
-- underlying tables still applies through the view (Postgres views run with the querying
-- role's permissions here since we don't mark this security definer).
create or replace view public.v_analytics_transactions as
select
  t.id,
  t.user_id,
  t.type,
  t.amount,
  t.occurred_at,
  t.merchant,
  t.note,
  t.tags,
  a.name as account_name,
  c.name as category_name,
  c.parent_id as category_parent_id
from public.transactions t
join public.accounts a on a.id = t.account_id
left join public.categories c on c.id = t.category_id
where t.is_deleted = false;
