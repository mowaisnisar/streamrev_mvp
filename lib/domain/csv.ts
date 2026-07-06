// Flatten providers back to contract-line CSV with the same columns as the sheet. Pure.
import type { Provider } from "@/types/credentialing";

/** Sheet column order (matches the "Credentialing" tab). */
export const CSV_COLUMNS = [
  "client_id",
  "client_name",
  "provider_name",
  "NPI",
  "specialty",
  "provider_type",
  "assigned_specialist",
  "caqh_id",
  "caqh_status",
  "last_attestation_date",
  "psv_status",
  "payer_name",
  "credentialing_status",
  "submission_date",
  "effective_date",
  "recredentialing_due_date",
  "notes",
  "last_updated",
] as const;

function escapeCell(value: string | null): string {
  const s = value ?? "";
  // Quote if the cell contains a comma, quote, or newline; double internal quotes.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Serialize a provider list to contract-line CSV (one row per contract line). */
export function providersToCsv(providers: Provider[]): string {
  const lines: string[] = [CSV_COLUMNS.join(",")];

  for (const p of providers) {
    // A provider with no contract lines still emits one row (blank contract cols).
    const contractLines = p.contracts.length > 0 ? p.contracts : [null];
    for (const line of contractLines) {
      const cells: (string | null)[] = [
        p.clientId,
        p.clientName,
        p.name,
        p.npi,
        p.specialty,
        p.providerType,
        p.assignedSpecialist,
        p.caqhId,
        p.caqhStatus,
        p.lastAttestationDate,
        p.psvStatus,
        line?.payerName ?? null,
        line?.status ?? null,
        line?.submissionDate ?? null,
        line?.effectiveDate ?? null,
        line?.recredentialingDueDate ?? null,
        line?.notes ?? null,
        line?.lastUpdated ?? null,
      ];
      lines.push(cells.map(escapeCell).join(","));
    }
  }

  return lines.join("\r\n");
}
