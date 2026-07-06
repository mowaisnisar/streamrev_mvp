# StreamRev Dashboard — Complete Setup Guide

This guide takes you from an empty machine to a **live, secure, multi-tenant** StreamRev
credentialing dashboard. Follow it top-to-bottom the first time. Later sections (Drive
real-time, deploy) are optional/advanced.

> **What you're setting up:** a Next.js app that reads one Google Sheet, shows each client only
> their own providers, and signs users in with a magic-link email. See `CONTEXT.md` for the full
> product brief and `progress.md` for the build log.

---

## 0. What you'll need (accounts + tools)

| Thing | Why | Cost |
| --- | --- | --- |
| **Node.js ≥ 18.18** + **pnpm** | run/build the app | free |
| **Google Cloud** project | service account to read the Sheet | free |
| **The Google Sheet** | source of truth (Credentialing / ClientAccess / Schema tabs) | free |
| **Resend** account | sends the magic-link sign-in emails | free tier |
| **Upstash Redis** DB | stores auth sessions/verification tokens (required for magic links) | free tier |
| **Vercel** account | hosting (production) | free tier |

Everything above has a free tier that's plenty for this app.

---

## 1. Install the runtime

The project needs Node.js and pnpm. Check what you have:

```bash
node --version   # want ≥ 18.18 (or ≥ 20)
pnpm --version   # any 9.x
```

If `node` is missing (macOS):

- **Easiest:** download the "LTS" installer from <https://nodejs.org> and run it.
- **Homebrew:** `brew install node`
- **nvm:** `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash`
  then `nvm install --lts`

Then enable pnpm (ships with Node via Corepack):

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

Install the project's dependencies (run in the project folder):

```bash
pnpm install
```

---

## 2. Create your env file

```bash
cp .env.example .env.local
```

`.env.local` is git-ignored — **real secrets go here, never in `.env.example`**. You'll fill in
each value in the steps below. Here's the full map:

| Variable | Set in step | Required? |
| --- | --- | --- |
| `NEXTAUTH_URL` | 3 | yes |
| `AUTH_SECRET` | 3 | yes |
| `GOOGLE_SHEET_ID` | 4 | yes |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | 4 | yes (or the JSON var) |
| `RESEND_API_KEY` + `EMAIL_FROM` | 5 | yes |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | 6 | yes |
| `NEXT_PUBLIC_POLL_INTERVAL_MS`, `SHEET_CACHE_REVALIDATE_SECONDS` | tuning | optional |
| `DRIVE_WEBHOOK_URL`, `DRIVE_WATCH_TOKEN`, `CRON_SECRET` | 9 | optional (real-time) |

---

## 3. App URL + auth secret

In `.env.local`:

```bash
NEXTAUTH_URL="http://localhost:3000"        # your deployed URL in production
AUTH_SECRET="<paste output of: openssl rand -base64 32>"
```

Generate the secret:

```bash
openssl rand -base64 32
```

---

## 4. Google Sheets access (service account)

The app reads the Sheet with a **service account** — a robot Google identity. You create it once
and share the Sheet with it.

1. Go to <https://console.cloud.google.com> and create (or select) a project.
2. **Enable the Google Sheets API:** APIs & Services → **Library** → search "Google Sheets API"
   → **Enable**. (If you'll use Drive real-time in step 9, also enable **Google Drive API**.)
3. **Create the service account:** IAM & Admin → **Service Accounts** → **Create service account**.
   Give it a name like `streamrev-sheets`. You do **not** need to grant it any project roles —
   access is granted per-Sheet in step 6.
4. **Make a key:** open the service account → **Keys** → **Add key** → **Create new key** →
   **JSON** → download. This file contains `client_email` and `private_key`.
5. **Put the creds in `.env.local`.** Two options:
   - **Split (recommended):**
     ```bash
     GOOGLE_SERVICE_ACCOUNT_EMAIL="streamrev-sheets@<project>.iam.gserviceaccount.com"
     GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
     ```
     Copy the `private_key` value **exactly** as it appears in the JSON (with the `\n`s). Keep it
     on one line wrapped in double quotes.
   - **Or the whole JSON in one var:** `GOOGLE_SERVICE_ACCOUNT_JSON='<paste entire JSON>'`.
6. **Share the Sheet with the robot.** Open your Google Sheet → **Share** → paste the service
   account's email (`...@<project>.iam.gserviceaccount.com`) → give it **Viewer** → Send.
   *This is the step people forget — without it you'll get a 403.*
7. **Copy the Sheet ID** from the URL and set it:
   `https://docs.google.com/spreadsheets/d/`**`THIS_LONG_ID`**`/edit`
   ```bash
   GOOGLE_SHEET_ID="THIS_LONG_ID"
   ```

### Sheet structure the app expects

- **Tab `Credentialing`** — one row per provider × payer contract line. Header row must include:
  `client_id, client_name, provider_name, NPI, specialty, provider_type, assigned_specialist,
  caqh_id, caqh_status, last_attestation_date, psv_status, payer_name, credentialing_status,
  submission_date, effective_date, recredentialing_due_date, notes, last_updated`.
  Column **order doesn't matter** (mapped by header name). Dates are `YYYY-MM-DD`.
  `credentialing_status` must be one of: `Not Started, Application Submitted, Under Review,
  Info Requested, Approved/In-Network, Effective, Denied, Termed`.
- **Tab `ClientAccess`** — header row: `user_email, client_id, role, display_name`.
  One row per user. `role` is `admin` or `client`. An admin row uses `client_id = ALL`.
- **Tab `Schema`** — reference only; the app never reads it.

---

## 5. Email sign-in (Resend)

The app emails a one-click magic link instead of using passwords.

1. Create an account at <https://resend.com>.
2. **API key:** dashboard → **API Keys** → **Create** → copy it.
3. **Sender:** verify a domain (Domains → Add), or use Resend's onboarding sender for testing.
4. In `.env.local`:
   ```bash
   RESEND_API_KEY="re_xxxxxxxx"
   EMAIL_FROM="StreamRev <login@yourverifieddomain.com>"
   ```
   `EMAIL_FROM` must be a sender Resend will send from (a verified domain, or their test sender).

---

## 6. Auth session store (Upstash Redis)

Magic-link auth needs somewhere to store one-time verification tokens and sessions. We use
**Upstash Redis** (serverless, free tier, works great on Vercel).

1. Create an account at <https://upstash.com> → **Create Database** (Redis) → pick a region.
2. On the database page, find **REST API** → copy **`UPSTASH_REDIS_REST_URL`** and
   **`UPSTASH_REDIS_REST_TOKEN`**.
3. In `.env.local`:
   ```bash
   UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="Ax...."
   ```

> Without these, sign-in throws a clear "Auth adapter not configured" error. This same DB is
> reused by the optional Drive real-time feature (step 9).

---

## 7. Run it locally

```bash
pnpm dev
```

Open <http://localhost:3000>. You'll be redirected to `/signin`.

### Smoke-test the data connection first (no login needed)

In dev only, hit the debug route to confirm the Sheet is wired up:

```bash
curl http://localhost:3000/api/debug/rows
```

You should see per-client row counts, e.g.:

```json
{ "ok": true, "totalContractRows": 42, "rowsPerClient": { "clientA": 20, "clientB": 22 }, ... }
```

If you get an error:
- **403 / permission** → you didn't share the Sheet with the service-account email (step 4.6).
- **Missing env var** → re-check `.env.local` and restart `pnpm dev`.
- **`missingHeaders` listed** → a column name in the sheet doesn't match the expected header.

### Then sign in

1. On `/signin`, enter an email **that exists in the `ClientAccess` tab** (unknown emails are
   rejected by design — no self-provisioning).
2. Check your inbox → click the magic link → you land on the dashboard.
3. A `client` user sees only their own providers; an `admin` user (`client_id = ALL`) sees a
   client switcher with every client.

---

## 8. Verify the tests

```bash
pnpm test
```

This runs the domain + tenancy unit tests, including the **cross-tenant isolation** test
(`lib/domain/scope.test.ts`) proving a client session can't load another tenant's rows.

---

## 9. (Optional) Real-time updates via Google Drive push

Polling (every 5 min by default) is the reliable baseline and needs no extra setup. If you want
edits to appear near-instantly, enable Drive push notifications:

1. Enable the **Google Drive API** (step 4.2) and make sure the Sheet is shared with the service
   account.
2. Set these env vars (locally you'd need a public HTTPS tunnel like ngrok; normally you do this
   in production):
   ```bash
   DRIVE_WEBHOOK_URL="https://yourdomain.com/api/drive/webhook"
   DRIVE_WATCH_TOKEN="<random string>"     # openssl rand -hex 16
   CRON_SECRET="<random string>"           # protects the renewal cron
   ```
3. Register the watch channel by hitting the cron route once (it also runs on a schedule):
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/renew-watch
   ```
4. `vercel.json` schedules `/api/cron/renew-watch` **once a day** (Vercel **Hobby/free** plan
   caps crons at once per day — sub-daily needs Pro). To keep the channel alive between daily
   runs, the webhook **self-renews**: whenever an edit notification arrives and the channel is
   within 6h of expiry, it re-registers automatically. If the app is completely idle for a day
   the channel may lapse until the next cron run — polling (Phase 6) covers that gap, so no data
   is ever missed. On Vercel, set `CRON_SECRET` and the cron is picked up automatically. You can
   also force a renew any time: `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/renew-watch`.

How it works: Google POSTs to `/api/drive/webhook` on any change → we verify the token, debounce
rapid edits, and revalidate the cache → the next client poll (or Refresh) shows fresh data.

---

## 10. Deploy to Vercel

1. Push this repo to GitHub, then **Import** it in Vercel (<https://vercel.com/new>).
2. **Environment variables:** add every var from your `.env.local` to the Vercel project
   (Settings → Environment Variables). Change `NEXTAUTH_URL` to your real URL, e.g.
   `https://streamrev.vercel.app`.
3. Update Resend's `EMAIL_FROM` domain if needed and confirm the sender is verified.
4. Deploy. Then:
   - Sign in with a real `ClientAccess` email end-to-end.
   - Edit a cell in the Google Sheet, click **Refresh** in the app, confirm it updates.
   - (If step 9) run the `renew-watch` curl once so real-time is active.

Auth.js automatically issues **secure, http-only cookies** over HTTPS, and `next.config.ts`
sets HSTS + other security headers.

---

## 11. Operating the app (day-2)

**Onboard a new client — no code, no deploy:**
1. Add a row to **`ClientAccess`**: `user_email`, the new `client_id`, `role = client`,
   `display_name`.
2. Add that client's provider rows to **`Credentialing`** using the same `client_id`.
3. The app picks them up automatically (within the poll window, or immediately after **Refresh**).
   Admins see the new client in the switcher; that client's users can sign in and see only their
   data. A client with zero rows sees a friendly "not configured yet" message.

**Add an admin:** add a `ClientAccess` row with `role = admin` and `client_id = ALL`.

**Change the poll interval:** set `NEXT_PUBLIC_POLL_INTERVAL_MS` (ms). Cache freshness window is
`SHEET_CACHE_REVALIDATE_SECONDS`.

**Rotate the service-account key:** create a new JSON key in Google Cloud, update
`GOOGLE_SERVICE_ACCOUNT_*` (Vercel + local), then delete the old key in the console.

**A column name changed in the sheet:** the app maps by header text, so renames need the header
updated to match the expected names in step 4. Missing columns surface a yellow diagnostic banner
(and a server log) rather than crashing.

---

## 12. Security & compliance notes

- **Tenancy is enforced server-side.** The browser only ever receives its own tenant's rows; a
  `client_id` sent from the browser is ignored for non-admins and validated for admins. This is
  covered by an automated test (`scope.test.ts`).
- **Credentials stay on the server.** Google keys are read only in `server-only` modules and are
  never bundled to the browser.
- **Least privilege:** the Sheets client uses the read-only scope; Drive uses read-only and only
  if you enable step 9.
- **No PHI is in scope.** The data is business/credentialing data only. **If patient-identifying
  data ever enters the sheet, HIPAA controls become mandatory before go-live:** signed BAAs with
  Google and Vercel, audit logging, encryption at rest, and access reviews. Do not put PHI in the
  sheet without these.

---

## Troubleshooting quick table

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `/api/debug/rows` 403 | Sheet not shared with service account | Share as Viewer (step 4.6) |
| "Missing required environment variable" | var absent in `.env.local` | add it, restart `pnpm dev` |
| Sign-in says access denied | email not in `ClientAccess` | add a row for that email |
| Magic link never arrives | Resend key / sender not verified | check `RESEND_API_KEY`, `EMAIL_FROM` |
| "Auth adapter not configured" | Upstash vars missing | set `UPSTASH_REDIS_REST_*` (step 6) |
| Yellow banner about missing columns | header names don't match | rename sheet headers to match step 4 |
| Edits don't show | still within cache/poll window | click **Refresh**, or enable step 9 |
