# lib/ — server-only modules

Data access, auth, and Google integration live here. **Nothing in this folder may
be imported by a client component.**

Planned layout:

- `lib/google/sheets.ts` — Google Sheets API client (service account). _Phase 1._
- `lib/domain/` — pure business logic: grouping, status, aggregation, alerts, CSV. _Phase 2._
- `lib/auth/` — Auth.js config + session → tenancy resolution. _Phase 3._
- `lib/data/` — `CredentialingSource` interface + cached scoped reads. _Phases 1 & 3._
