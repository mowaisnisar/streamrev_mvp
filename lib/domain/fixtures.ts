// Test fixtures. A fixed "today" and helpers to build rows/providers.
import type { ContractRow } from "@/types/credentialing";

export const TODAY = new Date(Date.UTC(2026, 0, 15)); // 2026-01-15

export function row(overrides: Partial<ContractRow>): ContractRow {
  return {
    client_id: "c1",
    client_name: "Client One",
    provider_name: "Dr. Jane Doe",
    NPI: "1000000001",
    specialty: "Cardiology",
    provider_type: "MD",
    assigned_specialist: "Sam Specialist",
    caqh_id: "CAQH1",
    caqh_status: "Active",
    last_attestation_date: "2025-06-01",
    psv_status: "Complete",
    payer_name: "Aetna",
    credentialing_status: "Effective",
    submission_date: "2025-01-01",
    effective_date: "2025-03-01",
    recredentialing_due_date: "2028-03-01",
    notes: null,
    last_updated: "2025-12-01",
    ...overrides,
  };
}
