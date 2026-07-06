import "server-only";
import type { Session } from "next-auth";
import { getScopedProviders, type ClientRef } from "@/lib/auth/tenancy";
import { aggregate, buildAlerts, type Aggregates, type Alert } from "@/lib/domain";
import type { Provider, Role } from "@/types/credentialing";

/** The full, already-tenant-scoped payload the dashboard renders. */
export interface DashboardPayload {
  role: Role;
  activeClientId: string;
  clients: ClientRef[];
  providers: Provider[];
  aggregates: Aggregates;
  alerts: Alert[];
  diagnostics: {
    missingHeaders: string[];
    unknownStatuses: string[];
  };
  /** ISO timestamp of when this snapshot was produced (for "Synced <time>"). */
  syncedAt: string;
}

export async function buildDashboardPayload(
  session: Session,
  requestedClientId?: string | null,
): Promise<DashboardPayload> {
  const scoped = await getScopedProviders(session, requestedClientId);

  // Phase 8: log schema issues server-side so operators notice sheet drift.
  if (scoped.missingHeaders.length > 0) {
    console.warn("[streamrev] Credentialing sheet missing columns:", scoped.missingHeaders);
  }
  if (scoped.unknownStatuses.length > 0) {
    console.warn("[streamrev] Unrecognized credentialing_status values:", scoped.unknownStatuses);
  }

  return {
    role: scoped.role,
    activeClientId: scoped.activeClientId,
    clients: scoped.clients,
    providers: scoped.providers,
    aggregates: aggregate(scoped.providers),
    alerts: buildAlerts(scoped.providers),
    diagnostics: {
      missingHeaders: scoped.missingHeaders,
      unknownStatuses: scoped.unknownStatuses,
    },
    syncedAt: new Date().toISOString(),
  };
}
