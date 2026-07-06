import { NextResponse, type NextRequest } from "next/server";
import { revalidateSheetData } from "@/lib/data";
import { shouldRevalidate } from "@/lib/data/watchStore";
import { renewIfExpiringSoon } from "@/lib/google/watch";

/**
 * Google Drive push-notification webhook (Phase 7). Google POSTs here when the
 * watched Sheet changes. We verify the channel token, debounce rapid edits, then
 * revalidate the "sheet-data" cache so the next client poll/refetch is fresh.
 * POST /api/drive/webhook
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-goog-channel-token");
  const expected = process.env.DRIVE_WATCH_TOKEN;
  if (expected && token !== expected) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const state = req.headers.get("x-goog-resource-state");
  // The initial "sync" handshake carries no change; acknowledge without revalidating.
  if (state === "sync") {
    return new NextResponse(null, { status: 200 });
  }

  if (await shouldRevalidate()) {
    revalidateSheetData();
  }

  // Keep the channel alive between daily cron runs (Hobby-plan friendly): renew
  // lazily when it's near expiry. Best-effort — never blocks the ack.
  await renewIfExpiringSoon();

  return new NextResponse(null, { status: 200 });
}
