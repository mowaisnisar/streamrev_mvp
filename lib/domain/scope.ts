// Pure tenancy-scoping decision. No server-only imports, so it is unit-testable.
// This is the heart of the multi-tenancy rule (CONTEXT.md): a client NEVER sees
// another tenant's rows, and an admin's requested clientId is validated.
import { ADMIN_CLIENT_ID, type Provider, type Role } from "@/types/credentialing";

export interface ScopeDecision {
  providers: Provider[];
  activeClientId: string;
}

/**
 * Filter `allProviders` to exactly what the session may see.
 *
 * @param allProviders     every provider (already grouped)
 * @param role             session role
 * @param sessionClientId  the client_id bound to the session (from ClientAccess)
 * @param requestedClientId  a client_id requested via the browser (admins only)
 * @param validClientIds   the set of real client_ids (to validate admin requests)
 */
export function scopeProviders(
  allProviders: Provider[],
  role: Role,
  sessionClientId: string,
  requestedClientId: string | null | undefined,
  validClientIds: Set<string>,
): ScopeDecision {
  if (role === "admin") {
    if (
      requestedClientId &&
      requestedClientId !== ADMIN_CLIENT_ID &&
      validClientIds.has(requestedClientId)
    ) {
      return {
        providers: allProviders.filter((p) => p.clientId === requestedClientId),
        activeClientId: requestedClientId,
      };
    }
    // No (or invalid) narrow request → see everything.
    return { providers: allProviders, activeClientId: ADMIN_CLIENT_ID };
  }

  // Non-admin: ALWAYS and ONLY their own client_id. requestedClientId is ignored.
  return {
    providers: allProviders.filter((p) => p.clientId === sessionClientId),
    activeClientId: sessionClientId,
  };
}
