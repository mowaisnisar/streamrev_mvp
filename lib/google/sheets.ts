import "server-only";
import { google, type sheets_v4 } from "googleapis";
import { getGoogleCredentials, env } from "@/lib/env";

/**
 * Server-only Google Sheets API v4 client.
 * NEVER import this module (directly or transitively) from a client component.
 */

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

let cachedClient: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient;
  const { clientEmail, privateKey } = getGoogleCredentials();
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });
  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}

/**
 * Read a tab's full used range as a 2D array of raw cell strings.
 * The first row is treated as the header row by callers.
 */
export async function readTab(tabName: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: env.sheetId,
    range: tabName,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  const values = res.data.values ?? [];
  // Normalize every cell to a trimmed string.
  return values.map((row) => row.map((cell) => (cell == null ? "" : String(cell).trim())));
}
