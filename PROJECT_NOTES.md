# BUDGY — Notes for picking this back up

Working notes for a fresh session/agent. This is not user-facing docs (see `README.md` /
`SETUP.md` for that) — it's context that isn't obvious from just reading the code.

## What this project is

Next.js 16 (App Router) personal finance / budgeting app ("BUDGY"), using:
- Supabase (Postgres + Auth) as the backend, `@supabase/ssr` for server/client auth clients.
- Drizzle ORM (`lib/db/schema.ts`) for the schema; migrations in `lib/db/migrations/` are plain
  SQL run manually in the Supabase SQL editor (not `db:push` against production).
- LLM-assisted natural-language quick-add (`/ask`), with a fast-parse → rules → LLM-fallback
  pipeline. User-supplied OpenRouter/Gemini/HuggingFace keys, AES-256-GCM encrypted at rest
  with `ENCRYPTION_KEY`.
- PWA with offline queueing for quick-add.
- Vercel cron jobs for recurring transactions and reminders (`vercel.json`).

## Current DB situation (as of 2026-08-24)

**The original Supabase project (ref `dkfbsddqvbgqclshjuuh`) was accidentally deleted.** It has
been replaced by a new project, ref `yjtrjuqzlhedaxhvhsqt` (`.mcp.json` already points at it, and
the Supabase MCP connection is live). Via the MCP `apply_migration` tool, all three migrations in
`lib/db/migrations/` have been applied to it, in order:

- `0000_mute_vampiro.sql` — tables/enums/indexes/FKs.
- `0001_rls_views_functions.sql` — FKs into `auth.users`, RLS policies on every table,
  balance/spend/card-cycle/analytics views, and the `handle_new_user` signup trigger.
- `0002_security_hardening.sql` (new) — added after `get_advisors` flagged issues post-recreation:
  sets `security_invoker = on` on the four views (they default to SECURITY DEFINER, which bypasses
  the querying user's RLS), pins `search_path` on `set_updated_at`/`check_splits_sum`, and revokes
  `EXECUTE` on `handle_new_user()` from `public`/`anon`/`authenticated` (it's SECURITY DEFINER and
  should only run via the `on_auth_user_created` trigger, not be callable as
  `/rest/v1/rpc/handle_new_user`). `get_advisors(type: "security")` returns zero lints now.

`list_tables` confirms all 17 `public` tables exist with `rls_enabled: true`.

`.env.local` is fully updated and verified working end-to-end (browser-driven register + sign-in,
landed on a rendering `/` dashboard with real DB-backed data, no console/server errors):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — new project's values.
- `DATABASE_URL` — **must use the Transaction pooler**, not the direct `db.<ref>.supabase.co:5432`
  host. The direct host is IPv6-only and fails with `getaddrinfo ENOENT` on IPv4-only networks
  (this dev machine included). Current value uses
  `aws-0-ap-northeast-2.pooler.supabase.com:6543` with the username in `postgres.<project-ref>`
  form (pooler-specific — not just `postgres`). Also: the DB password contains `?`, `&`, `!` —
  these are URL-reserved and must stay percent-encoded (`%3F`, `%26`, `%21`) in the connection
  string or `postgres.js` throws `TypeError: Invalid URL` before ever attempting to connect.

Old `ENCRYPTION_KEY` / `CRON_SECRET` in `.env.local` didn't need to change (app-level secrets,
unrelated to the Supabase project).

Auth service settings (Authentication → Providers → Email → **Confirm email**, and Authentication
→ URL Configuration → Site URL) are dashboard-only — no MCP tool here exposes them. User confirmed
Confirm email is OFF on this project as of 2026-08-24 (required — see the Auth section below).

## Auth: magic link → email/password → unified no-confirmation form (2026-08-24)

The user found magic-link login unreliable and asked to switch to email/password, then asked for
no email confirmation with a single form that registers on first use and signs in on repeat use.
Current state:

- `app/(auth)/login/page.tsx` — single email+password form, no sign-in/sign-up toggle. On submit
  it calls `supabase.auth.signUp` first; if that succeeds it returns a session immediately
  (works because **Confirm email is OFF** in the Supabase project) and redirects. If `signUp`
  errors because the email is already registered (`error.code === "user_already_exists"` or the
  message contains "already registered"), it falls back to `supabase.auth.signInWithPassword`.
  Any other `signUp` error (e.g. weak password) is shown as-is.
- `app/(auth)/forgot-password/page.tsx` — `resetPasswordForEmail`, unchanged.
- `app/(auth)/reset-password/page.tsx` — `updateUser({ password })`, landed on after clicking the
  reset-password email link (via `/auth/callback`), unchanged.
- `lib/supabase/middleware.ts` — `/forgot-password` and `/reset-password` are in `PUBLIC_PATHS`.
- `app/auth/callback/route.ts` — unchanged; still only needed for the password-recovery link
  now, since signup no longer sends a confirmation link.
- `e2e/smoke.spec.ts` — updated to fill the single form and expect an immediate redirect to `/`
  instead of a "check your email" message.

**Confirm email is OFF** on the `yjtrjuqzlhedaxhvhsqt` project (user confirmed toggled off in
dashboard on 2026-08-24) — this is required for the unified form to work; if it's ever turned
back on, `signUp()` for a new email won't return a session and the form will show a stuck error
instead of logging the user in.

**Verified end-to-end with a headless-browser (Playwright) test against the live dev server and
new Supabase project**, 2026-08-24: a brand-new email registers straight into a rendering
Dashboard with no confirmation step (`signUp` → 200 with session); re-entering the same
email+password after clearing cookies signs in via the fallback path (`signUp` → 422 "already
registered" → `signInWithPassword` → 200), also landing on the Dashboard. No console or server
errors on either path. Forgot/reset-password was not exercised (needs a real inbox to click the
link) — that's still only reasoned-about-correct, not test-verified.

## Dark mode + dashboard debt stats (2026-08-24)

- `next-themes` was already an installed dependency but unused — wired up in `app/providers.tsx`
  (`ThemeProvider attribute="class" defaultTheme="system" enableSystem`). `app/globals.css`
  already had a full `.dark` OKLCH token set from the shadcn scaffold, so no new CSS was needed.
  `app/layout.tsx` got `suppressHydrationWarning` on `<html>` (required since next-themes sets the
  class client-side) and `viewport.themeColor` became a light/dark media-query pair instead of one
  hardcoded hex.
- New `components/theme-toggle.tsx` — dropdown (Light/Dark/System) using the existing
  `DropdownMenu`/`Button` primitives (this repo uses `@base-ui/react`, not Radix — triggers take a
  `render` prop, see `components/mobile-nav.tsx` for the existing pattern). Placed in the app
  shell header (`app/(app)/layout.tsx`) and top-right on the three unauthenticated auth pages
  (login/forgot-password/reset-password), since users should be able to switch themes before
  logging in.
- Responsiveness: the app shell (`app/(app)/layout.tsx` + `components/mobile-nav.tsx`) and every
  page checked were already fully responsive (sidebar → Sheet drawer below `md`, grids that
  collapse, tables that scroll horizontally) — this was pre-existing, not new work.
- Dashboard debt stats: added `getDebtSummary(userId)` to `lib/db/queries/debts.ts` (sums
  outstanding balance across unsettled debts, split by `direction`) and wired it into
  `app/(app)/page.tsx` → `components/dashboard/summary-tiles.tsx` as two more tiles ("Owed to me",
  "I owe"), extending the grid from 5 to 7 tiles (`lg:grid-cols-4 xl:grid-cols-7`).
- Verified with a headless-browser pass: dark class toggles correctly and persists across reload,
  dashboard renders correctly in both themes with the two new debt tiles, and the mobile drawer
  nav works in dark mode at a 390px viewport. No console/server errors.

## Supabase MCP setup (in progress)

Added `.mcp.json` at repo root so Claude Code can manage the Supabase project directly (run SQL,
inspect schema, etc.) instead of the user copy-pasting SQL into the dashboard:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=<PROJECT_REF>"],
      "env": { "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}" }
    }
  }
}
```

Still needed:
- The `--project-ref` in `.mcp.json` must be updated once the new project is created (old value
  `dkfbsddqvbgqclshjuuh` is stale/deleted).
- A Supabase **personal access token** (from supabase.com/dashboard/account/tokens — this is
  different from the anon/publishable key in `.env.local`) needs to be set as the
  `SUPABASE_ACCESS_TOKEN` env var in the shell Claude Code runs in, then Claude Code needs a
  restart to pick up the new MCP server.
- The user was about to answer how they want to provide that token (env var vs. pasting directly)
  when they paused to recreate the deleted project — revisit that question once the new project
  exists.

## Notable non-obvious things

- `AGENTS.md`/`CLAUDE.md` at repo root is auto-regenerated by `next dev` — don't worry about
  editing it away, it's expected to reappear.
- `lib/db/migrations/0001_rls_views_functions.sql` is hand-written and NOT reproducible from
  `drizzle-kit generate` — if the schema changes, only the incremental new migration file is
  generated; RLS/views/triggers must be maintained by hand in future numbered files.
- `test:e2e` requires a real Supabase project + `DATABASE_URL` since the login page needs valid
  env vars just to render.
