# BUDGY — Setup

## 1. Create the Supabase project

1. Go to https://supabase.com/dashboard and create a new project (pick a region close to you,
   e.g. `ap-south-1`). Save the database password somewhere safe.
2. In **Settings → API**, copy the **Project URL** and **anon public key**.
3. In **Settings → Database → Connection string**, select the **Transaction pooler** tab and
   copy the URI (port `6543`). Replace `[YOUR-PASSWORD]` with your DB password.

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from step 1.2.
- `DATABASE_URL` — from step 1.3.
- `ENCRYPTION_KEY` and `CRON_SECRET` — generate each with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

## 3. Install dependencies

```bash
npm install
```

## 4. Run the database migration

In the Supabase dashboard, open **SQL Editor → New query**, and run these three files from
`lib/db/migrations/` **in order**, each as its own run:


1. `0000_mute_vampiro.sql` — creates all tables, enums, indexes, and foreign keys.
2. `0001_rls_views_functions.sql` — adds foreign keys into `auth.users`, enables Row Level
   Security with per-user policies on every table, creates the balance/spend/card-cycle/
   analytics views, and sets up the trigger that provisions a profile, starter categories,
   and a default Cash account for every new signup.
3. `0002_security_hardening.sql` — closes Supabase's security-linter findings: forces the views
   to run with the querying user's RLS (`security_invoker`) instead of the view owner's, pins
   `search_path` on the trigger functions, and revokes public/anon/authenticated `EXECUTE` on
   the signup trigger function so it can't be called directly as an RPC.

These are plain SQL, safe to read before running. They're split from each other because
`drizzle-kit` (which generated file 1 from `lib/db/schema.ts`) doesn't manage the `auth`
schema, RLS, or views — those are hand-written.

If you change `lib/db/schema.ts` later, run `npm run db:generate` to produce a new
incremental migration file, then paste just that new file into the SQL editor.

## 5. Enable email auth

In the Supabase dashboard: **Authentication → Providers**, confirm **Email** is enabled, and turn
**Confirm email** OFF — the login form signs a brand-new email straight in without a
confirmation link (see below). Password reset emails still work with this off. Under
**Authentication → URL Configuration**, set:
- Site URL: `http://localhost:3000` (add your Vercel URL here too once deployed, as an
  additional redirect URL: `https://your-app.vercel.app/**`)

## 6. Run locally

```bash
npm run dev
```

Visit http://localhost:3000 and enter an email and password. The same form registers you if
that email hasn't been used before, or signs you in if it has — there's no separate sign-up step
and no confirmation email to check.

## 7. Add your LLM keys

Once logged in, go to **Settings → LLM Providers** in the app and add your OpenRouter, Google
Gemini, and/or HuggingFace API keys. Reorder the chain so your preferred/free-tier models are
tried first. Nothing is sent anywhere until you use the natural-language quick-add or `/ask`.

## 8. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Import Project**, select the repo.
3. Add all variables from `.env.local` as Vercel Environment Variables (Production + Preview).
   Set `NEXT_PUBLIC_APP_URL` to your production URL.
4. Deploy. Add the deployed URL to Supabase's **Authentication → URL Configuration → Redirect
   URLs** as `https://your-app.vercel.app/**`.

### Cron jobs

`vercel.json` registers two daily jobs (`/api/cron/recurring`, `/api/cron/reminders`). Vercel's
free (Hobby) plan runs cron jobs once a day; no extra setup is needed beyond deploying — Vercel
reads `vercel.json` automatically and sends `Authorization: Bearer $CRON_SECRET`.

## 9. Install as an app (PWA)

Once deployed (or running locally over HTTPS), open the site on your phone and use
"Add to Home Screen" (iOS Safari) or the install prompt (Android Chrome). Quick-add works
offline — entries are queued in the browser and synced automatically the next time you're
online.

## Running tests

```bash
npm test          # unit tests (Vitest) — no external services required
npm run test:e2e  # Playwright — requires a real Supabase project (see step 1) and DATABASE_URL,
                   # since the login page needs valid Supabase env vars to render at all
```

## Known limitations / next steps

- **`/api/cron/reminders`** computes budget-overrun and card-due-date reminders but only
  returns them as JSON — there's no email/push channel wired up (no provider was requested
  for that). The same information is already surfaced in-app (Budgets page progress bars,
  Cards page due-date badges); wiring the cron output to an email provider (e.g. Resend) is a
  natural next step.
- **Receipt OCR, bank-SMS parsing, and voice entry** (Tier 3 in the original feature list)
  aren't built — the NL pipeline's architecture (fast parse → rules → LLM fallback) is
  designed to accept more input modalities later without changes to the core.

## Troubleshooting

- **Reset-password links redirect to an error page** — check the Supabase Site URL / Redirect
  URLs match exactly (including trailing `/**`).
- **Signing up doesn't log you in / lands you back on `/login`** — check that **Confirm email**
  is OFF in Authentication → Providers → Email; with it on, `signUp()` won't return a session.
- **`db:push` fails with a permissions error** — make sure `DATABASE_URL` uses the pooler
  connection string with your actual password substituted in, not the placeholder.
- **LLM calls always fail** — open Settings → LLM Providers → the health panel shows the exact
  error (auth/quota/rate-limit) and which key it came from.
