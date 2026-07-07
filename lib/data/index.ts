import "server-only";
import { sheetSource } from "@/lib/data/sheetSource";
import type { ContractRow, AccessRow } from "@/types/credentialing";

/**
 * Data-access layer. All sheet reads go through here.
 *
 * Demo mode: reads hit Google Sheets directly on every request — NO caching. This
 * keeps the app dead simple and correct: a newly-added client, provider, or access
 * email shows up immediately (both in the dashboard and when resolving tenancy at
 * sign-in), with no stale-cache window. The dashboard page is force-dynamic and SWR
 * polls, so freshness is expected here anyway.
 *
 * If read volume ever becomes a concern, reintroduce `unstable_cache` around these
 * with a short `revalidate` and wire `revalidateSheetData()` back to `revalidateTag`.
 */

export const SHEET_DATA_TAG = "sheet-data";

interface CredentialingData {
  rows: ContractRow[];
  missingHeaders: string[];
}
interface AccessData {
  rows: AccessRow[];
  missingHeaders: string[];
}

export async function getCredentialingRows(): Promise<CredentialingData> {
  return sheetSource.getCredentialingRows();
}

export async function getAccessRows(): Promise<AccessData> {
  return sheetSource.getAccessRows();
}

/**
 * Explicit fresh read for the sign-in gate. Identical to `getAccessRows()` now that
 * reads are uncached, but kept as its own name so the intent ("sign-in must never see
 * stale access rows") survives if caching is ever reintroduced above.
 */
export async function getAccessRowsFresh(): Promise<AccessData> {
  return sheetSource.getAccessRows();
}

/**
 * No-op in demo mode (reads are already uncached). Kept so the manual Refresh button
 * and the Drive webhook still have a safe function to call; the next read is always
 * fresh regardless.
 */
export function revalidateSheetData(): void {
  // Intentionally empty — nothing to invalidate when reads are uncached.
}
