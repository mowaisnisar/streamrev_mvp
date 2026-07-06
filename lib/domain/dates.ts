// Small date helpers for YYYY-MM-DD strings. Pure, UTC-based to avoid TZ drift.

/** Parse a YYYY-MM-DD string to a UTC Date, or null if invalid. */
export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole days from `from` to `to` (positive if `to` is in the future). */
export function daysBetween(from: Date, to: Date): number {
  const MS = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / MS);
}

/** Days until `dateStr` relative to `today`; null if unparseable. */
export function daysUntil(dateStr: string | null | undefined, today: Date): number | null {
  const d = parseDate(dateStr);
  return d ? daysBetween(today, d) : null;
}
