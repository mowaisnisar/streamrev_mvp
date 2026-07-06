import "server-only";
import { readTab } from "@/lib/google/sheets";
import { parseCredentialing, parseAccess } from "@/lib/data/mapping";
import type { CredentialingSource } from "@/lib/data/source";

/** CredentialingSource backed by the single Google Sheet (Credentialing + ClientAccess tabs). */
export const sheetSource: CredentialingSource = {
  async getCredentialingRows() {
    const values = await readTab("Credentialing");
    return parseCredentialing(values);
  },
  async getAccessRows() {
    const values = await readTab("ClientAccess");
    return parseAccess(values);
  },
};
