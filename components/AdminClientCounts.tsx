import type { Provider } from "@/types/credentialing";
import type { ClientRef } from "@/lib/auth/tenancy";

/** Admin-only strip showing provider counts per client (portfolio overview). */
export function AdminClientCounts({
  providers,
  clients,
  onSelect,
}: {
  providers: Provider[];
  clients: ClientRef[];
  onSelect: (clientId: string) => void;
}) {
  const counts = new Map<string, number>();
  for (const p of providers) counts.set(p.clientId, (counts.get(p.clientId) ?? 0) + 1);

  return (
    <div className="client-counts" aria-label="Providers per client">
      {clients.map((c) => (
        <button key={c.clientId} className="client-chip" onClick={() => onSelect(c.clientId)}>
          <span className="client-chip__name">{c.clientName}</span>
          <span className="client-chip__count">{counts.get(c.clientId) ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
