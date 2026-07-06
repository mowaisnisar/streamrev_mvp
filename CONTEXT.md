# StreamRev Credentialing Dashboard — Project Brief (CONTEXT.md)

> This is the durable brief. **Every later phase reads this file first.** It is derived
> from the build plan in `phases.md` ("How this system is being built" + "History").

## What this is

A **secure, multi-tenant web dashboard** for **StreamRev**, a US healthcare
**credentialing & contracting** company. Each client (surgical center, hospital,
behavioral-health group, or provider group) logs in and sees the live credentialing and
payer-contract status of **only their own** providers. StreamRev's internal team maintains
the data in a Google Sheet; the dashboard reflects backend edits automatically.

## Source of truth

One **Google Sheet** (uploaded from `StreamRev_Credentialing_MockData.xlsx`) with three tabs:

- **`Credentialing`** — the flat source of truth. **One row per provider × payer contract line.**
- **`ClientAccess`** — maps `user_email → client_id → role` for login + tenancy
  (also carries `display_name`).
- **`Schema`** — column definitions and allowed values (reference only; **not read by the app**).

### `Credentialing` columns the app reads

```
client_id, client_name, provider_name, NPI, specialty, provider_type,
assigned_specialist, caqh_id, caqh_status, last_attestation_date, psv_status,
payer_name, credentialing_status, submission_date, effective_date,
recredentialing_due_date, notes, last_updated
```

- Allowed `credentialing_status` values:
  `Not Started`, `Application Submitted`, `Under Review`, `Info Requested`,
  `Approved/In-Network`, `Effective`, `Denied`, `Termed`.
- Dates are `YYYY-MM-DD` strings. `NPI` and `caqh_id` are **text**.
- The grouping key for a provider is **`NPI`**.

## Tech stack (chosen)

- **Next.js (App Router) + TypeScript** — server components and route handlers keep Google
  credentials server-side, never in the browser. This is why Next is the right call.
- **Google Sheets API v4** via `googleapis`, authenticated with a **service account**.
- **Auth.js (NextAuth v5)** — passwordless **email magic-link** sign-in (**Resend** as the
  mail provider). The signed-in email is resolved to `client_id` + `role` via `ClientAccess`.
- **Caching + freshness** — server-side cached reads (`unstable_cache` / tag-based
  revalidation) + client polling via **SWR** + a manual **Refresh** button. Optional true
  real-time via **Google Drive push notifications** (`files.watch`) → webhook that
  revalidates the cache.
- **Styling** — port the existing prototype's design system (custom CSS; IBM Plex Sans/Mono +
  Bricolage Grotesque, teal `#0E7490` brand, status color tokens). **Do not redesign.**
- **Deploy** — **Vercel**. Secrets in Vercel env vars.

## Multi-tenancy rule (non-negotiable)

Tenant filtering happens **on the server**. A route handler resolves the session email →
`client_id`, then filters `Credentialing` rows by that `client_id` before anything reaches
the browser.

- `role = client` → sees only their own `client_id`.
- `role = admin` (`client_id = ALL`) → may view every client and switch between them;
  any requested `client_id` is validated against the known set.
- **Never trust a `client_id` sent from the browser.**

## PHI / HIPAA (not in scope for MVP — flag, don't build)

The current data is **business/credentialing data only — no PHI**. If any
patient-identifying data ever enters the sheet, HIPAA controls become **mandatory**:
a signed **BAA with Google & Vercel**, **audit logging**, **encryption at rest**, and
**access reviews**. Do not store PHI without these in place.

## History (context)

1. User asked for a client dashboard over data in Google Drive, auto-updating on backend edits.
2. Refined a detailed product prompt (roles, data model, auto-update, security, features, design).
3. Data is organized per client in Drive folders; near-term path chosen is **one Google Sheet**
   read via the Sheets API.
4. A **working front-end prototype** (`StreamRevDashboard.jsx`) was built on mock data: client
   switcher (incl. admin "All clients"), a signature **credentialing pipeline rail**, summary
   stat cards, an alerts panel (denials, info requests, CAQH re-attestation, re-credentialing
   due within 90 days), a searchable/sortable/filterable provider table, a provider drill-down
   drawer, CSV export, and a simulated "last synced / refresh".
5. This plan turns that prototype into a real Next.js app wired to the live sheet.

## Scale path (note only)

The folder-per-client model still works later — swap the single-sheet read for a
`client_id → Drive folder ID` registry and read each client's own sheet. Keep the
data-access layer abstracted (a `CredentialingSource` interface, Phase 1) so this swap is
localized.
