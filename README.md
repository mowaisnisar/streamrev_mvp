# StreamRev Credentialing Dashboard

A secure, multi-tenant Next.js dashboard for **StreamRev** (a US healthcare credentialing &
contracting company). Each client logs in and sees the live credentialing and payer-contract
status of **only their own** providers. The source of truth is a single **Google Sheet**, read
server-side via the Google Sheets API. See [`CONTEXT.md`](./CONTEXT.md) for the full brief and
[`progress.md`](./progress.md) for the phased build log.

> **Status:** Phase 0 (scaffold) complete. Data layer, auth, and dashboard land in later phases.

## Tech stack

- **Next.js (App Router) + TypeScript** — keeps Google credentials server-side.
- **Google Sheets API v4** (`googleapis`) via a **service account**.
- **Auth.js (NextAuth v5)** — passwordless email magic-link (Resend).
- **SWR** polling + cached server reads for freshness; optional Drive push notifications.
- **Deploy:** Vercel.

## Prerequisites

- **Node.js ≥ 18.18** (or ≥ 20). Check with `node --version`.
- **pnpm** (`corepack enable && corepack prepare pnpm@latest --activate`, or `npm i -g pnpm`).

> If Node isn't installed: on macOS install it via the official installer at
> <https://nodejs.org> or, if you use Homebrew, `brew install node`. Then enable pnpm with
> `corepack enable`.

## Local setup

```bash
# 1. Install dependencies
pnpm install

# 2. Create your local env file and fill in values
cp .env.example .env.local
#    (Phase 0 only needs no secrets to render the placeholder home page.)

# 3. Run the dev server
pnpm dev
# → open http://localhost:3000
```

Other scripts: `pnpm build`, `pnpm start`, `pnpm lint`.

## Environment variables

All secrets live in `.env.local` (never committed — see `.gitignore`). Copy `.env.example` and
fill in real values. Summary of what each phase introduces:

| Var | Phase | Purpose |
| --- | --- | --- |
| `NEXTAUTH_URL` | 3 | Public base URL for magic-link callbacks |
| `GOOGLE_SHEET_ID` | 1 | The Sheet ID from the Google Sheet URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | 1 | Service-account creds (or `GOOGLE_SERVICE_ACCOUNT_JSON`) |
| `AUTH_SECRET` | 3 | Auth.js session secret (`openssl rand -base64 32`) |
| `RESEND_API_KEY` / `EMAIL_FROM` | 3 | Magic-link email delivery |
| `NEXT_PUBLIC_POLL_INTERVAL_MS` / `SHEET_CACHE_REVALIDATE_SECONDS` | 6 | Freshness tuning |
| `DRIVE_WEBHOOK_URL`, Upstash vars | 7 | Optional real-time (Drive push) |

## Google Sheets service account (needed from Phase 1)

> Documented now so it's ready. Not required to run the Phase 0 placeholder.

1. In the **Google Cloud Console**, create (or pick) a project.
2. **Enable the Google Sheets API** (APIs & Services → Library → "Google Sheets API" → Enable).
   (Enable the **Google Drive API** too only if you implement Phase 7 real-time.)
3. **Create a service account** (IAM & Admin → Service Accounts → Create). No project roles
   are required — access is granted per-sheet in the next step.
4. Under the service account → **Keys → Add key → Create new key → JSON**, and download it.
   Put the values into `.env.local` (`GOOGLE_SERVICE_ACCOUNT_EMAIL` +
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, or the whole JSON in `GOOGLE_SERVICE_ACCOUNT_JSON`).
   **Never commit the key file.**
5. **Share the Google Sheet** with the service account's email address
   (`...@<project>.iam.gserviceaccount.com`) as **Viewer** — this is what grants read access.
6. Copy the **Sheet ID** from the URL
   (`https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`) into `GOOGLE_SHEET_ID`.

## Security notes

- Google credentials are **server-only** — never imported into client components or exposed in
  the browser bundle.
- Multi-tenancy is enforced **server-side**: the session email is resolved to a `client_id` and
  rows are filtered before reaching the browser. A `client_id` from the browser is never trusted.
- **No PHI** is in scope. If patient-identifying data ever enters the sheet, HIPAA controls
  (BAAs with Google & Vercel, audit logging, encryption at rest, access reviews) become
  mandatory prerequisites. See `CONTEXT.md`.

## Deployment

Target is **Vercel**. Set all env vars in the Vercel project settings; configure the Auth.js
callback URL and Resend sender in Phase 9. See `phases.md` Phase 9 for the go-live checklist.
