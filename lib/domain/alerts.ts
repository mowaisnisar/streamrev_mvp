// Alert generation over providers. Pure, with an injectable "today" for tests.
import type { Provider } from "@/types/credentialing";
import { isInNetwork } from "@/lib/domain/status";
import { daysUntil } from "@/lib/domain/dates";

export type AlertSeverity = "high" | "med";
export type AlertType =
  | "Denied"
  | "Info Requested"
  | "Recredentialing Due"
  | "CAQH Attestation";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  providerNpi: string;
  providerName: string | null;
  clientId: string;
  clientName: string | null;
  payerName: string | null;
  message: string;
  /** Relevant date (recred due date / attestation), if any. */
  date: string | null;
}

/** Days-out threshold for a re-credentialing alert. */
export const RECRED_WINDOW_DAYS = 90;

const CAQH_ALERT_STATUSES = new Set(["Attestation Due", "Re-attestation Needed"]);

const SEVERITY_ORDER: Record<AlertSeverity, number> = { high: 0, med: 1 };

/**
 * Produce a sorted alert list:
 *  - Denied lines (high)
 *  - Info Requested lines (high)
 *  - Re-credentialing due within 90 days for in-network lines (med)
 *  - CAQH "Attestation Due" / "Re-attestation Needed" (med)
 * Sorted by severity (high first), then by date ascending (soonest first).
 */
export function buildAlerts(providers: Provider[], today: Date = new Date()): Alert[] {
  const alerts: Alert[] = [];

  for (const p of providers) {
    // CAQH attestation (provider-level).
    if (p.caqhStatus && CAQH_ALERT_STATUSES.has(p.caqhStatus)) {
      alerts.push({
        id: `caqh:${p.npi}`,
        severity: "med",
        type: "CAQH Attestation",
        providerNpi: p.npi,
        providerName: p.name,
        clientId: p.clientId,
        clientName: p.clientName,
        payerName: null,
        message: `CAQH ${p.caqhStatus.toLowerCase()}`,
        date: p.lastAttestationDate,
      });
    }

    for (const line of p.contracts) {
      if (line.status === "Denied") {
        alerts.push({
          id: `denied:${p.npi}:${line.payerName ?? ""}`,
          severity: "high",
          type: "Denied",
          providerNpi: p.npi,
          providerName: p.name,
          clientId: p.clientId,
          clientName: p.clientName,
          payerName: line.payerName,
          message: `Denied by ${line.payerName ?? "payer"}`,
          date: line.lastUpdated,
        });
      } else if (line.status === "Info Requested") {
        alerts.push({
          id: `info:${p.npi}:${line.payerName ?? ""}`,
          severity: "high",
          type: "Info Requested",
          providerNpi: p.npi,
          providerName: p.name,
          clientId: p.clientId,
          clientName: p.clientName,
          payerName: line.payerName,
          message: `${line.payerName ?? "Payer"} requested additional information`,
          date: line.lastUpdated,
        });
      }

      // Re-credentialing due within window (only for in-network lines).
      if (isInNetwork(line.status)) {
        const days = daysUntil(line.recredentialingDueDate, today);
        if (days != null && days <= RECRED_WINDOW_DAYS && days >= 0) {
          alerts.push({
            id: `recred:${p.npi}:${line.payerName ?? ""}`,
            severity: "med",
            type: "Recredentialing Due",
            providerNpi: p.npi,
            providerName: p.name,
            clientId: p.clientId,
            clientName: p.clientName,
            payerName: line.payerName,
            message: `Re-credentialing with ${line.payerName ?? "payer"} due in ${days} day${
              days === 1 ? "" : "s"
            }`,
            date: line.recredentialingDueDate,
          });
        }
      }
    }
  }

  alerts.sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    // Both same severity: soonest date first; nulls last.
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return (a.providerName ?? "").localeCompare(b.providerName ?? "");
  });

  return alerts;
}
