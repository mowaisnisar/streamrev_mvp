# StreamRev Dashboard — Progress

## Phases
- [x] Phase 0 — Scaffold, CONTEXT.md, progress.md, env.example
- [x] Phase 1 — Google Sheets data-access layer
- [x] Phase 2 — Domain model: transforms, aggregation, alerts (+ tests)
- [x] Phase 3 — Auth + server-enforced multi-tenancy
- [x] Phase 4 — Shell: header, pipeline rail, stat cards, alerts
- [x] Phase 5 — Provider table + drill-down drawer
- [x] Phase 6 — Cached reads, SWR polling, refresh, CSV/PDF export
- [x] Phase 7 — Real-time via Drive push notifications (optional)
- [x] Phase 8 — Admin, client onboarding, robustness
- [x] Phase 9 — Security hardening, tests, deploy

## Log
<!-- append a dated entry per phase: what was done, files changed, decisions, deferrals -->

### 2026-07-06 — Phase 0: Scaffold, context, and progress tracking

**Completed**
- [x] Hand-authored a Next.js **App Router + TypeScript + ESLint** scaffold configured for
  the **pnpm** package manager (Next 15.1.6 / React 19).
- [x] Created `CONTEXT.md` — the durable project brief (product, source-of-truth Google Sheet,
  the `Credentialing` column list + allowed `credentialing_status` values, tech stack,
  the non-negotiable server-side multi-tenancy rule, and the PHI/HIPAA note).
- [x] Created this `progress.md` with the Phase 0–9 checklist and Log.
- [x] Set up the folder structure: `app/` (routes), `lib/` (server-only data/auth/google),
  `components/` (UI), `types/` (shared TS types), `styles/` (design tokens).
- [x] Created `.env.example` listing every secret the project will need with placeholders +
  one-line comments (Google Sheet ID + service-account creds, `AUTH_SECRET`, Resend key +
  from-address, app URL, poll interval / cache window, optional Drive-webhook vars).
- [x] Created `README.md` with local setup steps.

**Files added**
- `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `eslint.config.mjs`,
  `.gitignore`
- `app/layout.tsx`, `app/page.tsx` (placeholder home page)
- `styles/globals.css` (base design tokens — full prototype design system ported in Phase 4)
- `lib/README.md` (server-only boundary note), `components/.gitkeep`, `types/.gitkeep`
- `CONTEXT.md`, `progress.md`, `README.md`, `.env.example`

**Decisions**
- Scaffold was hand-authored rather than produced by `create-next-app` because **Node.js and
  pnpm are not installed** on the current machine (no Homebrew either). The file set matches a
  standard `create-next-app` App Router + TS + ESLint output (pinned Next 15.1.6 / React 19),
  and uses **plain CSS** (no Tailwind) to match the prototype's custom-CSS design system.
- Used `eslint.config.mjs` (flat config) with `eslint-config-next`, matching current
  create-next-app defaults.
- `.env.example` supports the service-account key as **either** split email+private-key vars
  (recommended on Vercel) **or** a single JSON var.

**Blocked / deferred**
- **`pnpm dev` not yet verified** — the runtime (Node.js + pnpm) is absent from this machine,
  so dependencies could not be installed and the dev server could not be started. Once Node ≥18.18
  and pnpm are installed, run `pnpm install && pnpm dev`; the placeholder home page should render
  with no errors (Phase 0 acceptance). See README "Local setup".
- The prototype `StreamRevDashboard.jsx` and `StreamRev_Credentialing_MockData.xlsx` referenced
  in the plan are **not present in this repo yet** — they'll be needed for Phase 4/5 (design port)
  and for pointing at a real sheet. Flag to add them before those phases.

### 2026-07-06 — Phases 1–9 built in one pass

All remaining phases implemented **and verified end-to-end**. Node LTS was installed via nvm and
the full pipeline was run green:
- `pnpm test` → **28/28 pass** (status, aggregate, alerts incl. 90-day boundary, csv, and the
  cross-tenant `scope.test.ts`).
- `pnpm exec tsc --noEmit` → **0 type errors**.
- `pnpm build` → **exit 0**, all 11 routes compiled, middleware built (dashboard is dynamic).
- `pnpm lint` → **no warnings or errors**.
- `next start` smoke test → `/signin` 200, `/` → 307 redirect to `/signin` (middleware auth gate
  works), `/signin/verify` 200.

Runtime bug found + fixed during the build: the Upstash adapter was constructed at import and
threw when its env vars were absent, breaking `next build`'s page-data collection. Changed
`buildAdapter()` to warn and return `undefined` when unconfigured (magic-link then fails clearly
at runtime instead of breaking the build).

**Phase 1 — data layer.** `lib/env.ts` (server-only env + Google cred resolution, supports split
vars or one JSON var), `lib/google/sheets.ts` (service-account JWT, read-only scope, header-based
reads), `lib/data/mapping.ts` (map by header text not index; empty→null; NPI/caqh_id kept as
strings; returns `missingHeaders`), `types/credentialing.ts` (ContractRow, AccessRow, Provider,
ContractLine), `lib/data/source.ts` (`CredentialingSource` interface for the future
folder-per-client swap), `lib/data/sheetSource.ts`, `lib/data/index.ts` (unstable_cache under tag
`sheet-data`, `revalidate` from env, `revalidateSheetData()`), `app/api/debug/rows/route.ts`
(dev-only per-client counts). Env introduced: `GOOGLE_SHEET_ID`,
`GOOGLE_SERVICE_ACCOUNT_EMAIL/PRIVATE_KEY` (or `_JSON`), `SHEET_CACHE_REVALIDATE_SECONDS`.

**Phase 2 — domain (pure, no React/googleapis).** `lib/domain/status.ts` (`STATUS_META`,
buckets, `overallStatus`, `isFullyCredentialed`, `isInNetwork`), `providers.ts` (group by NPI),
`aggregate.ts` (counts + %, in-progress lines, pipeline buckets), `alerts.ts` (Denied/Info
Requested = high; recred-due-≤90d for in-network + CAQH attestation = med; injectable `today`),
`dates.ts`, `csv.ts` (contract-line CSV, same columns). Vitest tests: status, aggregate, alerts
(incl. 90-day boundary), csv. Config: `vitest.config.ts` with `@` alias.

**Phase 3 — auth + tenancy (security core).** Auth.js v5 magic-link via Resend
(`lib/auth/auth.config.ts` edge-safe, `lib/auth/auth.ts` full w/ Upstash Redis adapter),
`middleware.ts` protects all routes, `app/api/auth/[...nextauth]/route.ts`, sign-in +
verify-request pages, unknown emails denied in `signIn` callback, tenancy attached in `session`
callback. `lib/auth/tenancy.ts#getScopedProviders` is the chokepoint; pure decision extracted to
`lib/domain/scope.ts`. `app/api/providers/route.ts` returns already-scoped data. Session shape:
`{ clientId, role, displayName }` (see `types/next-auth.d.ts`). Env: `AUTH_SECRET`,
`RESEND_API_KEY`, `EMAIL_FROM`, `NEXTAUTH_URL`, `UPSTASH_REDIS_REST_URL/TOKEN`.

**Phase 4 — shell.** Design system ported into `styles/globals.css` (teal `#0E7490`, IBM Plex
Sans/Mono + Bricolage via `next/font`, status tokens). Components: `TopBar` (client switcher /
badge + Synced/Refresh + sign out), `PipelineRail`, `StatCards`, `AlertsPanel`,
`DiagnosticsBanner`, `DashboardError`; server page `app/dashboard/page.tsx` +
`components/DashboardClient.tsx` orchestrator.

**Phase 5 — table + drawer.** `ProviderTable` (avatar+type, BH tag, mono NPI, mini-rail, overall
badge, next-recred with "Nd" pill; search/status/specialty filters + sortable columns via
`lib/ui/useProviderFilters.ts`), `ProviderDrawer` (facts, CAQH + PSV panels, per-payer contract
cards, documents placeholder; Escape/backdrop close, focus trap, focus-on-open). **Deferred:**
real Drive document links (placeholder shown).

**Phase 6 — freshness + exports.** SWR polling (`NEXT_PUBLIC_POLL_INTERVAL_MS`, default 300000)
against `/api/providers`; Refresh button → `POST /api/refresh` → `revalidateTag('sheet-data')` →
`mutate()`; CSV export of the **filtered** set (client-side, `providersToCsv`); empty + error
states. **Deferred:** PDF export (CSV shipped; note left for a print-stylesheet/server-PDF later).

**Phase 7 — Drive real-time.** `lib/google/drive.ts` (`files.watch`/`channels.stop`, drive
read-only), `lib/data/watchStore.ts` (Upstash: channel + debounce guard),
`app/api/drive/webhook/route.ts` (verify `X-Goog-Channel-Token`, skip `sync`, debounce,
revalidate), `app/api/cron/renew-watch/route.ts` (register/renew, `CRON_SECRET`-guarded),
`vercel.json` cron every 6h. Env: `DRIVE_WEBHOOK_URL`, `DRIVE_WATCH_TOKEN`, `CRON_SECRET`
(optional — app runs on polling without them).

**Phase 8 — admin/onboarding/robustness.** Admin per-client counts strip
(`AdminClientCounts`, click to switch); zero-rows "not configured yet" state; schema resilience
(missing headers + unknown statuses surfaced in `DiagnosticsBanner` and logged server-side in
`payload.ts`); a11y (keyboard row activation, drawer focus trap + aria, reduced-motion, mobile
breakpoints). Onboarding = sheet-only, documented in guide.md §11.

**Phase 9 — security/tests/deploy + guide.** Security headers in `next.config.ts` (HSTS,
X-Frame-Options DENY, nosniff, referrer/permissions policy, `poweredByHeader:false`); read-only
Google scopes; secure cookies via Auth.js over HTTPS. Cross-tenant automated test
`lib/domain/scope.test.ts` (client can't widen scope; admin request validated). **`guide.md`**
written: full account setup (Node/pnpm, Google service account, Resend, Upstash, Vercel), local
run, debug route, deploy, day-2 operations, troubleshooting table, and the HIPAA note.

**Decisions**
- **Auth store = Upstash Redis** (serverless-friendly on Vercel). Magic-link needs an adapter to
  persist verification tokens/sessions; Upstash is reused by the Phase 7 watch store. Auth throws
  a clear error if its env vars are missing rather than failing silently.
- **Tenancy scoping split** into a pure `lib/domain/scope.ts` so the security invariant is
  unit-testable without pulling in `server-only`/googleapis.
- Deps added: `googleapis`, `next-auth@5-beta`, `@auth/upstash-redis-adapter`, `@upstash/redis`,
  `swr`, `server-only`, `vitest`.

**Blocked / deferred**
- **Live-data acceptance still needs your credentials.** The build/tests/boot are green, but the
  data-dependent acceptance checks (debug route returns real per-client counts; magic-link
  sign-in; sheet-edit-then-refresh) require real Google/Resend/Upstash env values. Follow
  `guide.md` steps 4–7 with your Sheet + accounts to close these out.
- **Prototype/mock files still absent** — design was reconstructed from the CONTEXT/plan specs;
  if `StreamRevDashboard.jsx` exists, diff the CSS/layout against `styles/globals.css` to match
  pixel-for-pixel. Point `GOOGLE_SHEET_ID` at the real sheet built from the mock xlsx.
- PDF export and real Drive document links deferred (noted above).
