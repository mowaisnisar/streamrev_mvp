import "server-only";
import { registerWatch, stopWatch } from "@/lib/google/drive";
import { loadChannel, saveChannel } from "@/lib/data/watchStore";

/**
 * Shared Drive watch-channel lifecycle (Phase 7). Used by the daily cron AND by
 * the webhook's lazy self-renewal, so the channel stays alive on the Vercel
 * Hobby plan (which limits cron to once/day) without needing Pro.
 */

/** Re-register the watch channel: stop the old one, create a fresh one, persist it. */
export async function renewWatchChannel(): Promise<
  | { ok: true; channelId: string; expiresAt: string | null }
  | { ok: false; skipped: true; reason: string }
> {
  const webhookUrl = process.env.DRIVE_WEBHOOK_URL;
  const token = process.env.DRIVE_WATCH_TOKEN;
  if (!webhookUrl || !token) {
    return { ok: false, skipped: true, reason: "DRIVE_WEBHOOK_URL / DRIVE_WATCH_TOKEN not set." };
  }

  const existing = await loadChannel();
  if (existing) await stopWatch(existing);

  const channel = await registerWatch(webhookUrl, token);
  await saveChannel(channel);

  return {
    ok: true,
    channelId: channel.channelId,
    expiresAt: channel.expiration ? new Date(channel.expiration).toISOString() : null,
  };
}

/** Renew opportunistically if the channel is missing or expiring within the window. */
const RENEW_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function renewIfExpiringSoon(): Promise<void> {
  try {
    const existing = await loadChannel();
    const soon = !existing || !existing.expiration || existing.expiration - Date.now() < RENEW_THRESHOLD_MS;
    if (soon) await renewWatchChannel();
  } catch {
    // Best-effort; a failed lazy renewal must never break the webhook response.
  }
}
