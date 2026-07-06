import { NextResponse, type NextRequest } from "next/server";
import { registerWatch, stopWatch } from "@/lib/google/drive";
import { loadChannel, saveChannel } from "@/lib/data/watchStore";

/**
 * Renew (or first-time register) the Drive watch channel (Phase 7). Scheduled via
 * Vercel Cron (see vercel.json) and safe to hit on deploy. Stops any existing
 * channel, registers a fresh one, and persists it.
 * GET /api/cron/renew-watch
 */
export async function GET(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.DRIVE_WEBHOOK_URL;
  const token = process.env.DRIVE_WATCH_TOKEN;
  if (!webhookUrl || !token) {
    return NextResponse.json(
      { ok: false, skipped: true, reason: "DRIVE_WEBHOOK_URL / DRIVE_WATCH_TOKEN not set." },
      { status: 200 },
    );
  }

  try {
    const existing = await loadChannel();
    if (existing) await stopWatch(existing);

    const channel = await registerWatch(webhookUrl, token);
    await saveChannel(channel);

    return NextResponse.json({
      ok: true,
      channelId: channel.channelId,
      expiresAt: channel.expiration ? new Date(channel.expiration).toISOString() : null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
