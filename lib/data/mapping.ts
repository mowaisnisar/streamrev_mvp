import "server-only";
import type { ContractRow, AccessRow, Role } from "@/types/credentialing";

/**
 * Header-name → field mapping helpers. We map by header TEXT, not fixed column
 * index, so the sheet's column order can change without breaking the app.
 */

export interface ParseResult<T> {
  rows: T[];
  /** Expected headers that were not found in the sheet (for Phase 8 diagnostics). */
  missingHeaders: string[];
}

/** Build a lowercased header → column-index map from the header row. */
function headerIndex(header: string[]): Map<string, number> {
  const map = new Map<string, number>();
  header.forEach((h, i) => {
    const key = h.trim().toLowerCase();
    if (key && !map.has(key)) map.set(key, i);
  });
  return map;
}

/** Empty string → null. */
function nn(v: string | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

const CREDENTIALING_HEADERS = [
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

export function parseCredentialing(values: string[][]): ParseResult<ContractRow> {
  if (values.length === 0) return { rows: [], missingHeaders: [...CREDENTIALING_HEADERS] };
  const [header, ...body] = values;
  const idx = headerIndex(header);
  const missingHeaders = CREDENTIALING_HEADERS.filter((h) => !idx.has(h.toLowerCase()));

  const get = (row: string[], name: string): string | null => {
    const i = idx.get(name.toLowerCase());
    return i == null ? null : nn(row[i]);
  };

  const rows: ContractRow[] = [];
  for (const row of body) {
    const clientId = get(row, "client_id");
    const npi = get(row, "NPI");
    // A row needs at least a client_id and an NPI to be meaningful; skip blank rows.
    if (!clientId && !npi && row.every((c) => c.trim() === "")) continue;
    rows.push({
      client_id: clientId ?? "",
      client_name: get(row, "client_name"),
      provider_name: get(row, "provider_name"),
      NPI: npi ?? "",
      specialty: get(row, "specialty"),
      provider_type: get(row, "provider_type"),
      assigned_specialist: get(row, "assigned_specialist"),
      caqh_id: get(row, "caqh_id"),
      caqh_status: get(row, "caqh_status"),
      last_attestation_date: get(row, "last_attestation_date"),
      psv_status: get(row, "psv_status"),
      payer_name: get(row, "payer_name"),
      credentialing_status: get(row, "credentialing_status"),
      submission_date: get(row, "submission_date"),
      effective_date: get(row, "effective_date"),
      recredentialing_due_date: get(row, "recredentialing_due_date"),
      notes: get(row, "notes"),
      last_updated: get(row, "last_updated"),
    });
  }
  return { rows, missingHeaders };
}

const ACCESS_HEADERS = ["user_email", "client_id", "role", "display_name"] as const;

function normalizeRole(raw: string | null): Role {
  return raw && raw.trim().toLowerCase() === "admin" ? "admin" : "client";
}

export function parseAccess(values: string[][]): ParseResult<AccessRow> {
  if (values.length === 0) return { rows: [], missingHeaders: [...ACCESS_HEADERS] };
  const [header, ...body] = values;
  const idx = headerIndex(header);
  const missingHeaders = ACCESS_HEADERS.filter((h) => !idx.has(h.toLowerCase()));

  const get = (row: string[], name: string): string | null => {
    const i = idx.get(name.toLowerCase());
    return i == null ? null : nn(row[i]);
  };

  const rows: AccessRow[] = [];
  for (const row of body) {
    const email = get(row, "user_email");
    if (!email) continue;
    rows.push({
      user_email: email.toLowerCase(),
      client_id: get(row, "client_id") ?? "",
      role: normalizeRole(get(row, "role")),
      display_name: get(row, "display_name"),
    });
  }
  return { rows, missingHeaders };
}
