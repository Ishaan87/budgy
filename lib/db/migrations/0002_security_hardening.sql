-- Hand-written migration: closes Supabase security-linter findings surfaced after recreating
-- the project from 0000/0001. Run this AFTER 0001_rls_views_functions.sql.

-- Views default to SECURITY DEFINER (run as the view owner, bypassing querying user's RLS)
-- unless security_invoker is set. These views select from RLS-protected tables and are meant
-- to be scoped by the querying user, so force invoker semantics.
alter view public.v_account_balances set (security_invoker = on);
alter view public.v_monthly_category_spend set (security_invoker = on);
alter view public.v_card_cycles set (security_invoker = on);
alter view public.v_analytics_transactions set (security_invoker = on);

-- Pin search_path on SECURITY DEFINER-adjacent trigger functions to avoid schema-shadowing.
alter function public.set_updated_at() set search_path = public;
alter function public.check_splits_sum() set search_path = public;

-- handle_new_user is SECURITY DEFINER and only meant to run via the on_auth_user_created
-- trigger. Postgres grants EXECUTE to PUBLIC by default, which exposes it as a callable RPC
-- (/rest/v1/rpc/handle_new_user) to anon/authenticated. Revoke it.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
