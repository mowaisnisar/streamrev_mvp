import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { sheetSource } from "@/lib/data/sheetSource";
import { env } from "@/lib/env";
import type { ContractRow, AccessRow } from "@/types/credentialing";

/**
 * Cached data-access layer. All reads go through here. Reads are cached under a
 * single tag so a manual Refresh (Phase 6) or a Drive webhook (Phase 7) can
 * force-revalidate everything with `revalidateSheetData()`.
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

const cachedCredentialing = unstable_cache(
  async (): Promise<CredentialingData> => sheetSource.getCredentialingRows(),
  ["credentialing-rows"],
  { tags: [SHEET_DATA_TAG], revalidate: env.cacheRevalidateSeconds },
);

const cachedAccess = unstable_cache(
  async (): Promise<AccessData> => sheetSource.getAccessRows(),
  ["access-rows"],
  { tags: [SHEET_DATA_TAG], revalidate: env.cacheRevalidateSeconds },
);

export async function getCredentialingRows(): Promise<CredentialingData> {
  return cachedCredentialing();
}

export async function getAccessRows(): Promise<AccessData> {
  return cachedAccess();
}

/** Force the next read to refetch from the sheet. Used by Refresh + Drive webhook. */
export function revalidateSheetData(): void {
  revalidateTag(SHEET_DATA_TAG);
}
