import { NextResponse } from "next/server";
import { getCredentialingRows, getAccessRows } from "@/lib/data";
import { env } from "@/lib/env";

/**
 * Dev-only debug route: returns per-client row counts so you can verify the
 * Google Sheets connection without building UI. Guarded off in production.
 * GET /api/debug/rows
 */
export async function GET() {
  if (env.isProduction) {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  try {
    const [{ rows, missingHeaders }, access] = await Promise.all([
      getCredentialingRows(),
      getAccessRows(),
    ]);

    const perClient: Record<string, number> = {};
    for (const r of rows) {
      const key = r.client_id || "(blank)";
      perClient[key] = (perClient[key] ?? 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      totalContractRows: rows.length,
      distinctClients: Object.keys(perClient).length,
      rowsPerClient: perClient,
      accessRows: access.rows.length,
      diagnostics: {
        credentialingMissingHeaders: missingHeaders,
        accessMissingHeaders: access.missingHeaders,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
