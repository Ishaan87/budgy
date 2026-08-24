@AGENTS.md

## Progress log

### 2026-08-24
- **Fixed production login failure** on budgy.eeshaang.space: `NEXT_PUBLIC_SUPABASE_URL` set in Vercel's env vars pointed at a dead/deleted Supabase project (`dkfbsddqvbgqclshjuuh.supabase.co`, `ERR_NAME_NOT_RESOLVED`), while the live project is `yjtrjuqzlhedaxhvhsqt.supabase.co`. Fix: update `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel to the live project and redeploy (these are build-time-inlined vars, so a redeploy/rebuild is required, not just a restart).
- **Dark/light theming**: already fully implemented pre-existing (next-themes, `components/theme-toggle.tsx`, OKLCH token system in `app/globals.css`, `.dark` class variant). No new work needed here beyond verifying components use semantic tokens.
- **Made the whole app responsive** (mobile-first, 375px–1280px+) across dashboard, transactions, accounts/cards/debts, budgets/recurring/rules, and settings/ask/auth pages. Key patterns applied consistently:
  - Page headers stack `flex-col` → `sm:flex-row` with action buttons wrapping.
  - Card/list grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
  - All dialogs: `max-h-[85–90vh] overflow-y-auto` so long forms scroll instead of overflowing short mobile viewports; multi-column form grids collapse to `grid-cols-1` on mobile.
  - `transaction-table.tsx`: secondary columns (account/category) hidden below `sm:` instead of full card-list rewrite; relies on existing `overflow-x-auto` in `components/ui/table.tsx`.
  - Charts (dashboard) given responsive heights/fonts and `ResponsiveContainer` width="100%".
  - No functional/data-fetching logic touched anywhere — layout/className only.
- Verified with `tsc --noEmit` (clean) and `npm run build` (succeeds, all 30 routes generate).
- **Still open**: no manual browser check yet at real mobile widths — recommend testing on-device or via devtools responsive mode before considering the responsive pass fully done.
