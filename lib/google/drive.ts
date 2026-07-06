import "server-only";
import { google, type drive_v3 } from "googleapis";
import { randomUUID } from "crypto";
import { getGoogleCredentials, env } from "@/lib/env";

/**
 * Server-only Google Drive client, used ONLY for Phase 7 real-time push
 * notifications (files.watch on the Sheet's file). Requires the drive.readonly
 * scope AND the Sheet shared with the service account.
 */

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

let cached: drive_v3.Drive | null = null;

function driveClient(): drive_v3.Drive {
  if (cached) return cached;
  const { clientEmail, privateKey } = getGoogleCredentials();
  const auth = new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: SCOPES });
  cached = google.drive({ version: "v3", auth });
  return cached;
}

export interface WatchChannel {
  channelId: string;
  resourceId: string;
  expiration: number; // epoch ms
}

/**
 * Register a watch channel on the Sheet's Drive file. Google will POST change
 * notifications to `webhookUrl` (with X-Goog-Channel-Token = verificationToken).
 */
export async function registerWatch(
  webhookUrl: string,
  verificationToken: string,
): Promise<WatchChannel> {
  const drive = driveClient();
  const channelId = randomUUID();
  const res = await drive.files.watch({
    fileId: env.sheetId,
    requestBody: {
      id: channelId,
      type: "web_hook",
      address: webhookUrl,
      token: verificationToken,
    },
  });
  return {
    channelId,
    resourceId: res.data.resourceId ?? "",
    expiration: res.data.expiration ? Number(res.data.expiration) : 0,
  };
}

/** Stop an existing watch channel (used before re-registering on renewal). */
export async function stopWatch(channel: WatchChannel): Promise<void> {
  const drive = driveClient();
  await drive.channels
    .stop({ requestBody: { id: channel.channelId, resourceId: channel.resourceId } })
    .catch(() => {
      /* channel may already be expired/gone — ignore */
    });
}
