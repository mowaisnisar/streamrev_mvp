import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { buildDashboardPayload } from "@/lib/data/payload";

/**
 * Scoped data endpoint used by SWR (Phase 6). Returns ONLY the signed-in tenant's
 * data. The `clientId` query param is honored solely for admins (validated
 * server-side in getScopedProviders); a client-role session can never widen scope.
 * GET /api/providers?clientId=<optional, admin only>
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requestedClientId = req.nextUrl.searchParams.get("clientId");
    const payload = await buildDashboardPayload(session, requestedClientId);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "sheet_unreachable",
        message:
          err instanceof Error ? err.message : "We couldn't reach the credentialing sheet.",
      },
      { status: 502 },
    );
  }
}
