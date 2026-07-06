import "server-only";
import { Redis } from "@upstash/redis";
import type { WatchChannel } from "@/lib/google/drive";

/**
 * Small persistent store for the active Drive watch channel + a debounce guard,
 * backed by Upstash Redis (the same store used by Auth.js).
 */

const CHANNEL_KEY = "streamrev:drive:watch-channel";
const DEBOUNCE_KEY = "streamrev:drive:debounce";

function redis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function saveChannel(channel: WatchChannel): Promise<void> {
  const r = redis();
  if (!r) return;
  await r.set(CHANNEL_KEY, channel);
}

export async function loadChannel(): Promise<WatchChannel | null> {
  const r = redis();
  if (!r) return null;
  return (await r.get<WatchChannel>(CHANNEL_KEY)) ?? null;
}

/**
 * Returns true if we should act on this notification (i.e. not within the
 * debounce window). Rapid edits collapse into one revalidation per window.
 */
export async function shouldRevalidate(windowSeconds = 5): Promise<boolean> {
  const r = redis();
  if (!r) return true; // no store → don't debounce
  // SET NX with expiry: succeeds only if the key wasn't set within the window.
  const ok = await r.set(DEBOUNCE_KEY, Date.now(), { nx: true, ex: windowSeconds });
  return ok === "OK";
}
