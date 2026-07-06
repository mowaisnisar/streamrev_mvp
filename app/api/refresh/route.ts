import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { revalidateSheetData } from "@/lib/data";

/**
 * Manual refresh: force-revalidate the "sheet-data" cache tag so the next read
 * re-fetches from Google. Auth-gated; credentials never leave the server.
 * POST /api/refresh
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  revalidateSheetData();
  return NextResponse.json({ ok: true, refreshedAt: new Date().toISOString() });
}
