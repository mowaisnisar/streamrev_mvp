import "server-only";
import type { ContractRow, AccessRow } from "@/types/credentialing";

/**
 * Abstraction over the credentialing data backend. The single-Google-Sheet
 * reader implements this today; a future folder-per-client backend can replace
 * it without touching any caller (see CONTEXT.md "Scale path").
 */
export interface CredentialingSource {
  getCredentialingRows(): Promise<{ rows: ContractRow[]; missingHeaders: string[] }>;
  getAccessRows(): Promise<{ rows: AccessRow[]; missingHeaders: string[] }>;
}
