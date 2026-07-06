// Fold flat ContractRows into grouped Provider objects. Pure.
import type { ContractRow, Provider, ContractLine } from "@/types/credentialing";

/**
 * Group flat contract rows into providers keyed by NPI. Provider-level fields
 * are taken from the first row seen for that NPI; each row contributes a
 * contract line. Rows with no NPI are grouped under a synthetic key so they are
 * not silently dropped.
 */
export function groupProviders(rows: ContractRow[]): Provider[] {
  const byNpi = new Map<string, Provider>();

  for (const row of rows) {
    const key = row.NPI && row.NPI.trim() !== "" ? row.NPI : `__no-npi__:${row.provider_name ?? ""}`;
    let provider = byNpi.get(key);
    if (!provider) {
      provider = {
        npi: row.NPI ?? "",
        name: row.provider_name,
        clientId: row.client_id,
        clientName: row.client_name,
        specialty: row.specialty,
        providerType: row.provider_type,
        assignedSpecialist: row.assigned_specialist,
        caqhId: row.caqh_id,
        caqhStatus: row.caqh_status,
        lastAttestationDate: row.last_attestation_date,
        psvStatus: row.psv_status,
        contracts: [],
      };
      byNpi.set(key, provider);
    }
    const line: ContractLine = {
      payerName: row.payer_name,
      status: row.credentialing_status,
      submissionDate: row.submission_date,
      effectiveDate: row.effective_date,
      recredentialingDueDate: row.recredentialing_due_date,
      notes: row.notes,
      lastUpdated: row.last_updated,
    };
    provider.contracts.push(line);
  }

  return [...byNpi.values()].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}
