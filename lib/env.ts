import "server-only";

/**
 * Centralized, server-only access to environment variables.
 * Importing this file from a client component throws at build time (server-only).
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `Missing required environment variable "${name}". See .env.example and guide.md.`,
    );
  }
  return v;
}

function optionalNumber(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Resolve the Google service-account credentials from env, supporting either:
 *   (A) GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, or
 *   (B) GOOGLE_SERVICE_ACCOUNT_JSON (the full downloaded key JSON).
 * Private keys pasted with literal "\n" are normalized to real newlines.
 */
export function getGoogleCredentials(): { clientEmail: string; privateKey: string } {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json && json.trim() !== "") {
    const parsed = JSON.parse(json) as { client_email?: string; private_key?: string };
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key.");
    }
    return {
      clientEmail: parsed.client_email,
      privateKey: normalizeKey(parsed.private_key),
    };
  }
  return {
    clientEmail: required("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    privateKey: normalizeKey(required("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")),
  };
}

function normalizeKey(key: string): string {
  // Env vars often store the key with escaped newlines; restore real newlines.
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

export const env = {
  get sheetId(): string {
    return required("GOOGLE_SHEET_ID");
  },
  get cacheRevalidateSeconds(): number {
    return optionalNumber("SHEET_CACHE_REVALIDATE_SECONDS", 300);
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};
