// Shared types for the StreamRev Credentialing Dashboard.
// Safe to import from both server and client code (no runtime dependencies).

/** Canonical credentialing_status values allowed in the sheet (CONTEXT.md). */
export const CREDENTIALING_STATUSES = [
  "Not Started",
  "Application Submitted",
  "Under Review",
  "Info Requested",
  "Approved/In-Network",
  "Effective",
  "Denied",
  "Termed",
] as const;

export type CredentialingStatus = (typeof CREDENTIALING_STATUSES)[number];

/** Roles from the ClientAccess tab. */
export type Role = "admin" | "client";

/** Sentinel client_id for admins who can see every client. */
export const ADMIN_CLIENT_ID = "ALL";

/**
 * One row of the "Credentialing" tab — one provider × payer contract line.
 * Empty cells become null. NPI / caqh_id are kept as strings.
 * `credentialing_status` is a raw string (may be unrecognized — validated in the domain layer).
 */
export interface ContractRow {
  client_id: string;
  client_name: string | null;
  provider_name: string | null;
  NPI: string;
  specialty: string | null;
  provider_type: string | null;
  assigned_specialist: string | null;
  caqh_id: string | null;
  caqh_status: string | null;
  last_attestation_date: string | null;
  psv_status: string | null;
  payer_name: string | null;
  credentialing_status: string | null;
  submission_date: string | null;
  effective_date: string | null;
  recredentialing_due_date: string | null;
  notes: string | null;
  last_updated: string | null;
}

/** One row of the "ClientAccess" tab. */
export interface AccessRow {
  user_email: string;
  client_id: string;
  role: Role;
  display_name: string | null;
}

/** A single payer contract line attached to a provider (post-grouping). */
export interface ContractLine {
  payerName: string | null;
  status: string | null;
  submissionDate: string | null;
  effectiveDate: string | null;
  recredentialingDueDate: string | null;
  notes: string | null;
  lastUpdated: string | null;
}

/** A provider with all its contract lines, grouped by NPI. */
export interface Provider {
  npi: string;
  name: string | null;
  clientId: string;
  clientName: string | null;
  specialty: string | null;
  providerType: string | null;
  assignedSpecialist: string | null;
  caqhId: string | null;
  caqhStatus: string | null;
  lastAttestationDate: string | null;
  psvStatus: string | null;
  contracts: ContractLine[];
}
