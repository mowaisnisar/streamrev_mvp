// Client-safe UI helpers (no server-only imports).
import type { StatusBucket } from "@/lib/domain/status";
import type { OverallStatus } from "@/lib/domain/status";

/** Pipeline bucket display order, labels, and color tokens (for rail + legend). */
export const BUCKET_ORDER: StatusBucket[] = [
  "notStarted",
  "inProgress",
  "needsAction",
  "inNetwork",
  "termed",
];

export const BUCKET_META: Record<StatusBucket, { label: string; colorVar: string }> = {
  notStarted: { label: "Not Started", colorVar: "--status-not-started" },
  inProgress: { label: "In Progress", colorVar: "--status-in-progress" },
  needsAction: { label: "Needs Action", colorVar: "--status-needs-action" },
  inNetwork: { label: "In-Network", colorVar: "--status-in-network" },
  termed: { label: "Termed", colorVar: "--status-termed" },
};

/** Tint token for an overall-status badge background. */
export const OVERALL_TINT: Record<OverallStatus, { color: string; tint: string }> = {
  "Action Needed": { color: "--status-needs-action", tint: "--tint-needs-action" },
  "In-Network": { color: "--status-in-network", tint: "--tint-in-network" },
  "In Progress": { color: "--status-in-progress", tint: "--tint-in-progress" },
  "Not Started": { color: "--status-not-started", tint: "--tint-not-started" },
};

/** "Synced 3 min ago" style relative time. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((now.getTime() - then) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return new Date(iso).toLocaleDateString();
}

/** Format a YYYY-MM-DD date for display, or an em-dash if absent. */
export function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Initials for an avatar. */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.replace(/^(Dr\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i, "").trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").concat(parts[1]?.[0] ?? "").toUpperCase() || "?";
}

/** True if a date string is within `days` from now (for the "Nd" re-cred pill). */
export function isWithinDays(s: string | null | undefined, days: number, now: Date = new Date()): boolean {
  if (!s) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const diff = Math.round((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  return diff >= 0 && diff <= days;
}
