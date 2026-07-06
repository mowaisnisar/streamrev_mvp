import "server-only";
import type { Session } from "next-auth";
import { getCredentialingRows } from "@/lib/data";
import { groupProviders } from "@/lib/domain";
import { isKnownStatus } from "@/lib/domain/status";
import { scopeProviders } from "@/lib/domain/scope";
import type { Provider, Role } from "@/types/credentialing";

export interface ClientRef {
  clientId: string;
  clientName: string;
}

export interface ScopedProviders {
  providers: Provider[];
  role: Role;
  /** The client currently in view; ADMIN_CLIENT_ID ("ALL") when an admin views everything. */
  activeClientId: string;
  /** Clients the signed-in user may view (one for clients; all for admins). */
  clients: ClientRef[];
  /** Diagnostics surfaced to the UI (Phase 8). */
  missingHeaders: string[];
  unknownStatuses: string[];
}

function distinctClients(providers: Provider[]): ClientRef[] {
  const map = new Map<string, string>();
  for (const p of providers) {
    if (p.clientId && !map.has(p.clientId)) map.set(p.clientId, p.clientName ?? p.clientId);
  }
  return [...map.entries()]
    .map(([clientId, clientName]) => ({ clientId, clientName }))
    .sort((a, b) => a.clientName.localeCompare(b.clientName));
}

function collectUnknownStatuses(providers: Provider[]): string[] {
  const set = new Set<string>();
  for (const p of providers) {
    for (const line of p.contracts) {
      if (line.status && !isKnownStatus(line.status)) set.add(line.status);
    }
  }
  return [...set];
}

/**
 * The single tenancy chokepoint. Resolves the session to the providers it is
 * allowed to see. TENANCY IS ENFORCED HERE — never trust a client_id from the
 * browser for a non-admin, and validate any admin-requested clientId.
 *
 * @param session       the authenticated session (must have user.role/clientId)
 * @param requestedClientId  optional client the admin wants to view
 */
export async function getScopedProviders(
  session: Session,
  requestedClientId?: string | null,
): Promise<ScopedProviders> {
  const role = session.user.role;
  const sessionClientId = session.user.clientId;

  const { rows, missingHeaders } = await getCredentialingRows();
  const allProviders = groupProviders(rows);
  const validClientIds = new Set(allProviders.map((p) => p.clientId).filter(Boolean));

  // The single scoping decision (pure + unit-tested in lib/domain/scope.test.ts).
  const { providers, activeClientId } = scopeProviders(
    allProviders,
    role,
    sessionClientId,
    requestedClientId,
    validClientIds,
  );

  // Admins may switch clients, so they get the full client list; clients get only their own.
  const clients =
    role === "admin"
      ? distinctClients(allProviders)
      : [{ clientId: sessionClientId, clientName: providers[0]?.clientName ?? sessionClientId }];

  return {
    providers,
    role,
    activeClientId,
    clients,
    missingHeaders,
    unknownStatuses: collectUnknownStatuses(providers),
  };
}
