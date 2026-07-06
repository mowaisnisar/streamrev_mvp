import { NextResponse, type NextRequest } from "next/server";
import { renewWatchChannel } from "@/lib/google/watch";

/**
 * Renew (or first-time register) the Drive watch channel (Phase 7). Scheduled via
 * Vercel Cron once a day (see vercel.json — Hobby-plan compatible) and safe to hit
 * on deploy. The webhook also self-renews on activity, so daily is enough.
 * GET /api/cron/renew-watch
 */
export async function GET(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await renewWatchChannel();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
