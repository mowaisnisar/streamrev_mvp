// Pure status system. No React, no googleapis, no network.
import type { ContractLine } from "@/types/credentialing";

export type StatusBucket =
  | "notStarted"
  | "inProgress"
  | "needsAction"
  | "inNetwork"
  | "termed";

export interface StatusMeta {
  /** The pipeline bucket this status rolls up into. */
  bucket: StatusBucket;
  /** Human label (matches the sheet value). */
  label: string;
  /** CSS custom property token used for the status color. */
  colorVar: string;
}

/** Maps each credentialing_status to a bucket + display color. */
export const STATUS_META: Record<string, StatusMeta> = {
  "Not Started": { bucket: "notStarted", label: "Not Started", colorVar: "--status-not-started" },
  "Application Submitted": {
    bucket: "inProgress",
    label: "Application Submitted",
    colorVar: "--status-in-progress",
  },
  "Under Review": { bucket: "inProgress", label: "Under Review", colorVar: "--status-in-progress" },
  "Info Requested": {
    bucket: "needsAction",
    label: "Info Requested",
    colorVar: "--status-needs-action",
  },
  "Approved/In-Network": {
    bucket: "inNetwork",
    label: "Approved/In-Network",
    colorVar: "--status-in-network",
  },
  Effective: { bucket: "inNetwork", label: "Effective", colorVar: "--status-in-network" },
  Denied: { bucket: "needsAction", label: "Denied", colorVar: "--status-needs-action" },
  Termed: { bucket: "termed", label: "Termed", colorVar: "--status-termed" },
};

/** Fallback meta for an unrecognized status value (Phase 8 resilience). */
export const UNKNOWN_STATUS_META: StatusMeta = {
  bucket: "notStarted",
  label: "Unknown",
  colorVar: "--status-not-started",
};

export function statusMeta(status: string | null | undefined): StatusMeta {
  if (!status) return UNKNOWN_STATUS_META;
  return STATUS_META[status] ?? UNKNOWN_STATUS_META;
}

export function isKnownStatus(status: string | null | undefined): boolean {
  return !!status && status in STATUS_META;
}

const IN_NETWORK = new Set(["Effective", "Approved/In-Network"]);
const ACTIVE_OR_IN_NETWORK = new Set([
  "Application Submitted",
  "Under Review",
  "Approved/In-Network",
  "Effective",
]);

export type OverallStatus = "Action Needed" | "In-Network" | "In Progress" | "Not Started";

/**
 * Roll a provider's contract lines up to a single overall status:
 *   - "Action Needed" if ANY line is Denied or Info Requested
 *   - else "In-Network" if ALL lines are Effective/Approved-In-Network
 *   - else "In Progress" if ANY line is active or in-network
 *   - else "Not Started"
 */
export function overallStatus(contracts: ContractLine[]): OverallStatus {
  if (contracts.length === 0) return "Not Started";
  if (contracts.some((c) => c.status === "Denied" || c.status === "Info Requested")) {
    return "Action Needed";
  }
  if (contracts.every((c) => c.status != null && IN_NETWORK.has(c.status))) {
    return "In-Network";
  }
  if (contracts.some((c) => c.status != null && ACTIVE_OR_IN_NETWORK.has(c.status))) {
    return "In Progress";
  }
  return "Not Started";
}

/** True iff EVERY contract line is Effective or Approved/In-Network. */
export function isFullyCredentialed(contracts: ContractLine[]): boolean {
  return (
    contracts.length > 0 && contracts.every((c) => c.status != null && IN_NETWORK.has(c.status))
  );
}

/** True iff the line is currently in-network (used by re-credentialing alerts). */
export function isInNetwork(status: string | null | undefined): boolean {
  return !!status && IN_NETWORK.has(status);
}

const OVERALL_COLOR: Record<OverallStatus, string> = {
  "Action Needed": "--status-needs-action",
  "In-Network": "--status-in-network",
  "In Progress": "--status-in-progress",
  "Not Started": "--status-not-started",
};

export function overallStatusColorVar(status: OverallStatus): string {
  return OVERALL_COLOR[status];
}
