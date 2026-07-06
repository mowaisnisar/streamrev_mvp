import "server-only";
import { getAccessRows } from "@/lib/data";
import type { AccessRow } from "@/types/credentialing";

/** Look up a user's ClientAccess row by email (case-insensitive). Null if not found. */
export async function findAccess(email: string | null | undefined): Promise<AccessRow | null> {
  if (!email) return null;
  const { rows } = await getAccessRows();
  const target = email.trim().toLowerCase();
  return rows.find((r) => r.user_email === target) ?? null;
}

/** The set of known client_ids (used to validate an admin's requested clientId). */
export async function knownClientIds(): Promise<Set<string>> {
  const { rows } = await getAccessRows();
  const ids = new Set<string>();
  for (const r of rows) {
    if (r.client_id && r.client_id !== "ALL") ids.add(r.client_id);
  }
  return ids;
}
