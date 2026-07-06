# StreamRev Credentialing Dashboard — Phased Build Plan

This file is a build script for an AI coding agent (Claude Code, Cursor, etc.). Each
phase below is a **standalone prompt** — paste one phase at a time. Every phase tells the
agent to read `progress.md` and `CONTEXT.md` first, do the work, then update `progress.md`.
Run the phases in order; don't start a phase until the previous one's acceptance criteria pass.

---

## How this system is being built

**Product.** A secure, multi-tenant web dashboard for StreamRev (a US healthcare
credentialing & contracting company). Each client (surgical center, hospital, behavioral
health group, or provider group) logs in and sees the live credentialing and payer-contract
status of **only their own** providers. StreamRev's internal team maintains the data in a
Google Sheet; the dashboard reflects backend edits automatically.

**Source of truth.** One Google Sheet (uploaded from `StreamRev_Credentialing_MockData.xlsx`)
with three tabs:
- `Credentialing` — the flat source of truth. **One row per provider × payer contract line.**
- `ClientAccess` — maps `user_email → client_id → role` for login + tenancy.
- `Schema` — column definitions and allowed values (reference only; not read by the app).

**Tech stack (chosen):**
- **Next.js (App Router) + TypeScript** — server components and route handlers keep Google
  credentials server-side, never in the browser. This is the reason Next is the right call here.
- **Google Sheets API v4** via the `googleapis` package, authenticated with a **service account**.
- **Auth.js (NextAuth v5)** — passwordless email magic-link sign-in (Resend as the mail
  provider). The signed-in email is resolved to a `client_id` + `role` via the `ClientAccess` tab.
- **Caching + freshness** — server-side cached reads (`unstable_cache` / tag-based revalidation)
  plus client polling via **SWR** and a manual **Refresh** button. Optional true real-time via
  **Google Drive push notifications** (`files.watch`) hitting a webhook that revalidates the cache.
- **Styling** — port the existing prototype's design system (custom CSS; IBM Plex Sans/Mono +
  Bricolage Grotesque, teal `#0E7490` brand, the status color tokens). Do **not** redesign.
- **Deploy** — Vercel. Secrets in Vercel env vars.

**Multi-tenancy rule (non-negotiable).** Tenant filtering happens **on the server**. A route
handler resolves the session email → `client_id`, then filters `Credentialing` rows by that
`client_id` before anything reaches the browser. Admins (`role = admin`, `client_id = ALL`)
may view every client and switch between them. Never trust a client_id sent from the browser.

**Not in scope for MVP (flag, don't build):** if any patient-identifying data (PHI) ever enters
the sheet, HIPAA controls (a signed BAA with Google & Vercel, audit logging, encryption at rest,
access reviews) become mandatory. The current data is business/credentialing data only.

---

## History discussed so far (context for the agent)

1. The user asked for a client dashboard over data kept in Google Drive, auto-updating on backend edits.
2. We refined a detailed product prompt (roles, data model, auto-update, security, features, design).
3. The user confirmed data is organized **per client in Google Drive folders**, then decided the
   concrete near-term path is **one Google Sheet** (the mock provided) read via the Google Sheets API.
4. We built a **working front-end prototype** (`StreamRevDashboard.jsx`) on mock data: a client
   switcher (incl. an admin "All clients" view), a signature **credentialing pipeline rail**,
   summary stat cards, an alerts panel (denials, payer info requests, CAQH re-attestation,
   re-credentialing due within 90 days), a searchable/sortable/filterable provider table, a
   provider drill-down drawer, CSV export, and a simulated "last synced / refresh".
5. This plan turns that prototype into a real Next.js app wired to the live sheet.

> **Scale path (note only):** the earlier folder-per-client model still works later — swap the
> single-sheet read for a `client_id → Drive folder ID` registry and read each client's own sheet.
> Keep the data-access layer abstracted (Phase 1) so this swap is localized.

---

## The `Credentialing` tab schema (columns the app reads)

`client_id, client_name, provider_name, NPI, specialty, provider_type, assigned_specialist,
caqh_id, caqh_status, last_attestation_date, psv_status, payer_name, credentialing_status,
submission_date, effective_date, recredentialing_due_date, notes, last_updated`

Allowed `credentialing_status` values: `Not Started, Application Submitted, Under Review,
Info Requested, Approved/In-Network, Effective, Denied, Termed`.
Dates are `YYYY-MM-DD` strings. `NPI` and `caqh_id` are text. Grouping key for a provider is `NPI`.

---

## Progress tracking convention (every phase enforces this)

- `progress.md` — a living checklist. Each phase appends a dated entry: what was completed,
  files added/changed, decisions made, and anything deferred or blocked. Mark each phase's
  checklist items `[x]` when done. Never delete history; append.
- `CONTEXT.md` — created in Phase 0 from the two sections above ("How this system is being
  built" + "History discussed so far"). It's the durable brief every later phase reads first.

---

# Phases

## Phase 0 — Scaffold, context, and progress tracking

```
You are building the StreamRev Credentialing Dashboard. This is Phase 0 of a phased build.

TASK
1. Scaffold a new Next.js app: App Router, TypeScript, ESLint. Package manager: pnpm.
2. Create CONTEXT.md at the repo root containing the project brief: it is a secure,
   multi-tenant Next.js dashboard for StreamRev (a US healthcare credentialing company);
   clients log in and see only their own providers' credentialing + payer-contract status;
   the source of truth is a single Google Sheet ("Credentialing", "ClientAccess", "Schema"
   tabs) read via the Google Sheets API with a service account; auth is Auth.js email
   magic-link; multi-tenancy is enforced server-side by resolving the signed-in email to a
   client_id via the ClientAccess tab; freshness is cached server reads + SWR polling +
   manual refresh, with optional Google Drive push notifications for real-time. Include the
   exact "Credentialing" tab column list and the allowed credentialing_status values (get
   these from the build plan you were given). Note that no PHI is in scope; if it ever is,
   HIPAA controls become mandatory.
3. Create progress.md with a checklist of all phases (0-9) and a "Log" section. Mark Phase 0
   items complete as you finish them.
4. Set up the folder structure: app/ (routes), lib/ (server-only data + auth + google),
   components/ (UI), types/ (shared TS types), styles/. Add a .env.example listing every
   secret the project will need (Google service account creds, Sheet ID, Auth.js secret,
   Resend key, app URL) with placeholder values and one-line comments. Never commit real secrets.
5. Add a README.md with local setup steps.

TECH: Next.js (App Router) + TypeScript, pnpm, deploy target Vercel.

ACCEPTANCE
- `pnpm dev` runs a placeholder home page with no errors.
- CONTEXT.md, progress.md, README.md, .env.example all exist and are accurate.

Finish by updating progress.md: check off Phase 0 and log what you created.
```

## Phase 1 — Google Sheets data-access layer

```
Read CONTEXT.md and progress.md first. This is Phase 1: the data layer. Do not build UI yet.

TASK
1. Add a server-only module lib/google/sheets.ts that authenticates to the Google Sheets API
   v4 using a service account (googleapis package). Read credentials + the Sheet ID from env
   vars. This module must never be imported by client components.
2. Implement typed reads:
   - getCredentialingRows(): reads the "Credentialing" tab, returns typed rows.
   - getAccessRows(): reads the "ClientAccess" tab (user_email, client_id, role, display_name).
   Map header names to fields by header text, not by fixed column index, so column order can
   change safely. Trim whitespace; treat empty cells as null. Keep NPI/caqh_id as strings.
3. Define shared types in types/credentialing.ts (ContractRow, AccessRow) matching the schema
   in CONTEXT.md.
4. Wrap reads in a cached layer (Next unstable_cache or React cache) with a tag like
   "sheet-data" and a sane default revalidate (e.g. 300s). Expose a way to force-revalidate
   that tag (used later by refresh + webhooks).
5. Add a tiny dev-only script or route (e.g. /api/debug/rows, guarded to non-production) that
   returns row counts per client_id, so you can verify the connection without building UI.
6. Abstract the source behind an interface (e.g. CredentialingSource) so a future folder-per-
   client backend can replace the single-sheet reader without touching callers.

SETUP NOTES TO PUT IN README
- How to create a Google Cloud service account, enable the Sheets API, download the JSON key,
  and SHARE the Google Sheet with the service account's email (Viewer is enough).
- Which env vars hold the creds and the Sheet ID.

ACCEPTANCE
- Hitting the debug route returns correct per-client row counts from the real sheet.
- No Google credentials are reachable from any client bundle.

Update progress.md: check off Phase 1, list files added, note the env vars introduced.
```

## Phase 2 — Domain model: transforms, aggregation, alerts

```
Read CONTEXT.md and progress.md first. This is Phase 2: pure business logic, no UI, no network.

Port the logic from the prototype so the server and UI share one source of truth.

TASK (implement in lib/domain/, all pure + unit-testable)
1. Grouping: fold flat ContractRows into Provider objects keyed by NPI, each with its provider
   fields + an array of contract lines. Providers carry client_id/client_name.
2. Status system:
   - STATUS_META mapping each credentialing_status to a bucket
     (notStarted | inProgress | needsAction | inNetwork | termed) and its display colors.
   - overallStatus(contracts): "Action Needed" if any Denied/Info Requested; else "In-Network"
     if all lines are Effective/Approved; else "In Progress" if any active/in-network; else
     "Not Started".
   - isFullyCredentialed(contracts): true iff every line is Effective/Approved-In-Network.
3. Aggregation: given a set of providers, compute totals — provider count, fully-credentialed
   count + %, in-progress contract-line count, and pipeline bucket counts (for the rail).
4. Alerts: produce a sorted alert list — Denied lines, Info Requested lines, re-credentialing
   due within 90 days (for in-network lines), and CAQH "Attestation Due"/"Re-attestation Needed".
   Severity high/med. Use an injectable "today" (default now) so behavior is testable.
5. CSV serialization: flatten a provider list back to contract-line CSV with the same columns
   as the sheet.

TESTS
- Add unit tests (vitest) covering overallStatus, isFullyCredentialed, aggregation counts, and
  the 90-day alert boundary. Use a fixed "today" in tests.

ACCEPTANCE
- All tests pass. No import of React or googleapis in lib/domain/.

Update progress.md: check off Phase 2, list the functions + test coverage.
```

## Phase 3 — Authentication + server-enforced multi-tenancy

```
Read CONTEXT.md and progress.md first. This is Phase 3: auth and tenancy. This is the security core.

TASK
1. Add Auth.js (NextAuth v5) with a passwordless Email (magic link) provider via Resend.
   Protect all dashboard routes; unauthenticated users are redirected to sign-in.
2. On sign-in, resolve the user's email against the ClientAccess tab (getAccessRows from
   Phase 1): attach { clientId, role, displayName } to the session. Unknown emails are denied
   access with a clear message (no account provisioning from the sign-in screen).
3. Build a server-only helper getScopedProviders(session) that:
   - reads + transforms the sheet (Phases 1-2),
   - if role = client: returns ONLY providers whose client_id === session.clientId,
   - if role = admin (client_id = ALL): returns all providers, and supports an optional
     clientId argument to view one client.
   Tenancy is enforced HERE, server-side. Never accept a client_id from the browser for a
   non-admin. For admins, validate any requested client_id against the known set.
4. Add route handlers / server actions that return already-scoped data to the client. The
   browser never receives other tenants' rows.

ACCEPTANCE
- A client-role user can only ever load their own providers, even if they tamper with requests.
- An admin can load all clients and switch to a specific one.
- Unknown email is rejected.

Update progress.md: check off Phase 3, document the session shape and the tenancy helper.
```

## Phase 4 — Dashboard shell: header, pipeline rail, stat cards, alerts

```
Read CONTEXT.md and progress.md first. This is Phase 4: the top of the dashboard. Reuse the
prototype's design exactly (StreamRevDashboard.jsx) — same fonts, colors, spacing, and the
signature pipeline rail. Port its CSS into the app's styling approach; do not redesign.

TASK
1. Authenticated dashboard route. Server-fetch scoped providers (Phase 3), compute aggregates
   + alerts (Phase 2), pass to client components as props (already tenant-scoped).
2. Top bar: StreamRev mark, client switcher (admins see all clients + "All clients — Admin";
   clients see only their name, non-interactive), and a "Synced <time> / Refresh" control
   (wire the real refresh in Phase 6 — placeholder handler is fine here).
3. Page header: client name/kind + a line showing the data source.
4. Signature "Credentialing pipeline" rail: segmented bar over bucket counts with legend.
5. Four stat cards: Providers, Fully credentialed (+%), Contracts in progress, Needs attention.
6. Alerts panel: list the computed alerts (severity-colored), each clickable (opens drawer in
   Phase 5 — stub the handler now).
7. Responsive down to mobile; visible keyboard focus; respect prefers-reduced-motion.

ACCEPTANCE
- Numbers and rail match the underlying sheet for the signed-in tenant.
- Admin client-switch re-scopes every figure on the page.

Update progress.md: check off Phase 4, note which prototype styles were ported.
```

## Phase 5 — Provider table + drill-down drawer

```
Read CONTEXT.md and progress.md first. This is Phase 5. Match the prototype's table and drawer.

TASK
1. Provider table (client component over the scoped provider list):
   - columns: Provider (avatar + type, BH tag), Client (admin/all view only), NPI (mono),
     Specialty, a mini pipeline bar, overall Status badge, next re-credentialing date (with a
     "Nd" pill when within 90 days), and a chevron.
   - search (name / NPI / specialty / payer), filter by overall status, filter by specialty,
     and sortable columns. All client-side over already-scoped data.
2. Drill-down drawer (slide-over) on row/alert click:
   - header (name, specialty/client, overall badge), key facts (NPI, type, assigned specialist),
     CAQH panel (id, status chip, last attestation), PSV panel,
   - per-payer contract cards (payer, status badge, submitted/effective/recred dates, notes),
   - a "Documents in folder" section (see note below).
   - closes on backdrop click and Escape; focus moves into the drawer on open.
3. Documents: for MVP render document links as read from an optional column or a placeholder
   list, clearly marked. (Real Drive file links can be wired later via the Drive API.)

ACCEPTANCE
- Filtering/sorting/search work and never reveal out-of-tenant data.
- Drawer shows every contract line for the provider with correct dates and notes.

Update progress.md: check off Phase 5, note any columns deferred (e.g. document links).
```

## Phase 6 — Freshness: cached reads, SWR polling, manual refresh, exports

```
Read CONTEXT.md and progress.md first. This is Phase 6: make it feel live, and add exports.

TASK
1. Client data loading via SWR against the scoped route handler, with a polling interval
   (default 5 min, env-configurable). Show a "Synced <relative time>" indicator.
2. Manual "Refresh" button: revalidates the server "sheet-data" cache tag (Phase 1) and
   re-fetches; show a spinner + update the timestamp. Never expose credentials client-side.
3. Export: "Export CSV" downloads the currently filtered provider set as contract-line CSV
   (Phase 2 serializer). Add PDF export of the current view as a stretch (print stylesheet or
   a server-rendered PDF) — optional; note if deferred.
4. Empty/error states in the interface's own voice: a "no providers match these filters" state,
   and a "we couldn't reach the credentialing sheet — try Refresh" state if a fetch fails.

ACCEPTANCE
- Editing a cell in the Google Sheet is reflected after a refresh (and within the poll window).
- CSV downloads match the filtered rows exactly.

Update progress.md: check off Phase 6, record the poll interval env var and export formats shipped.
```

## Phase 7 — Real-time updates via Google Drive push notifications (advanced)

```
Read CONTEXT.md and progress.md first. This is Phase 7: optional true real-time. Polling from
Phase 6 is the reliable default; this makes edits appear near-instantly.

TASK
1. Register a Drive "watch" channel on the Sheet's file ID (Drive API files.watch) so Google
   POSTs a change notification to a webhook when the file changes. Store the channel id +
   resource id + expiration (a small persistent store, e.g. Upstash Redis or a DB row).
2. Add a webhook route handler that verifies the notification, then revalidates the
   "sheet-data" cache tag so the next client poll/refetch gets fresh data. Debounce rapid edits.
3. Add a scheduled job (Vercel Cron) to renew the watch channel before it expires and to
   re-register on deploy.
4. Document the tradeoffs in README: webhook setup requires a public HTTPS endpoint and channel
   renewal; if skipped, the app still works on polling.

ACCEPTANCE
- A backend edit triggers cache revalidation without a manual refresh; the dashboard updates on
  its next poll (or immediately if you also trigger a client refetch).

Update progress.md: check off Phase 7, or mark it "deferred — polling only" with a reason.
```

## Phase 8 — Admin, client onboarding, and robustness

```
Read CONTEXT.md and progress.md first. This is Phase 8: operational completeness.

TASK
1. Admin niceties: portfolio-wide "All clients" aggregates (already scoped in Phase 3), plus a
   simple client picker. Optionally a small admin note showing per-client provider counts.
2. Onboarding a new client (document in README + make it work): add a row per user to
   ClientAccess, add that client's provider rows to Credentialing with the new client_id — the
   app should pick them up with no code change. Add a friendly "data not configured for this
   client yet" state when a client has zero rows.
3. Schema resilience: if an expected column is missing or a status value is unrecognized,
   surface a clear diagnostic (don't crash), and log it server-side.
4. Accessibility + polish pass: keyboard nav across table and drawer, focus traps, aria labels,
   reduced-motion, and mobile layout checks.

ACCEPTANCE
- Adding a client purely by editing the sheet makes them appear (admin) and lets their users
  sign in and see only their data.
- Malformed sheet data degrades gracefully with a readable message.

Update progress.md: check off Phase 8, list the onboarding steps and any diagnostics added.
```

## Phase 9 — Security hardening, tests, and deployment

```
Read CONTEXT.md and progress.md first. This is Phase 9: ship it safely.

TASK
1. Security review against CONTEXT.md's tenancy rule: confirm every data path is scoped
   server-side; add an automated test that a client-role session cannot fetch another tenant's
   rows via any route. Set security headers (HTTPS-only, secure cookies), and use least-
   privilege Google scopes (read-only Sheets; Drive scope only if Phase 7 is enabled).
2. HIPAA note: reaffirm in README that no PHI is stored; if that changes, list the required
   controls (BAAs with Google and the host, audit logging, encryption at rest, access reviews)
   as prerequisites before go-live.
3. Tests: unit (domain), integration (scoped route handlers with mocked sheet + sessions), and
   a smoke e2e of sign-in → view → filter → drawer → export.
4. Deploy to Vercel: set all env vars, configure the Auth.js callback URL and email sender,
   set the poll interval, and (if Phase 7) the cron + webhook URL. Verify a real sign-in and a
   real sheet edit end-to-end in the deployed environment.
5. Final progress.md pass: mark all phases complete; write a short "How to run / operate"
   section (rotate the service-account key, add a client, change the poll interval).

ACCEPTANCE
- Cross-tenant access test passes. App is live on Vercel and reflects sheet edits.

Update progress.md: check off Phase 9 and record the production URL + operational notes.
```

---

## Suggested `progress.md` starter (Phase 0 should create this)

```markdown
# StreamRev Dashboard — Progress

## Phases
- [ ] Phase 0 — Scaffold, CONTEXT.md, progress.md, env.example
- [ ] Phase 1 — Google Sheets data-access layer
- [ ] Phase 2 — Domain model: transforms, aggregation, alerts (+ tests)
- [ ] Phase 3 — Auth + server-enforced multi-tenancy
- [ ] Phase 4 — Shell: header, pipeline rail, stat cards, alerts
- [ ] Phase 5 — Provider table + drill-down drawer
- [ ] Phase 6 — Cached reads, SWR polling, refresh, CSV/PDF export
- [ ] Phase 7 — Real-time via Drive push notifications (optional)
- [ ] Phase 8 — Admin, client onboarding, robustness
- [ ] Phase 9 — Security hardening, tests, deploy

## Log
<!-- append a dated entry per phase: what was done, files changed, decisions, deferrals -->
```
