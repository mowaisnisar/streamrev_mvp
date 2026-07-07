"use client";
import { useState, useCallback } from "react";
import useSWR from "swr";
import type { DashboardPayload } from "@/lib/data/payload";
import { ADMIN_CLIENT_ID } from "@/types/credentialing";
import { providersToCsv } from "@/lib/domain/csv";
import { useProviderFilters } from "@/lib/ui/useProviderFilters";
import { relativeTime } from "@/lib/ui/format";
import { TopBar } from "@/components/TopBar";
import { PipelineRail } from "@/components/PipelineRail";
import { StatCards } from "@/components/StatCards";
import { AlertsPanel } from "@/components/AlertsPanel";
import { ProviderTable } from "@/components/ProviderTable";
import { ProviderDrawer } from "@/components/ProviderDrawer";
import { DiagnosticsBanner } from "@/components/DiagnosticsBanner";
import { AdminClientCounts } from "@/components/AdminClientCounts";

const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? "300000");

async function fetcher(url: string): Promise<DashboardPayload> {
  const res = await fetch(url, { headers: { "Cache-Control": "no-store" } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "We couldn't reach the credentialing sheet.");
  }
  return res.json();
}

export function DashboardClient({
  initial,
  userName,
  demo = false,
}: {
  initial: DashboardPayload;
  userName: string;
  demo?: boolean;
}) {
  const [clientId, setClientId] = useState<string>(initial.activeClientId);
  const [openNpi, setOpenNpi] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const key =
    clientId && clientId !== ADMIN_CLIENT_ID
      ? `/api/providers?clientId=${encodeURIComponent(clientId)}`
      : "/api/providers";

  const { data, error, isLoading, mutate } = useSWR<DashboardPayload>(key, fetcher, {
    fallbackData: clientId === initial.activeClientId ? initial : undefined,
    refreshInterval: POLL_MS,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });

  const payload = data ?? initial;
  const showClient = payload.role === "admin" && payload.activeClientId === ADMIN_CLIENT_ID;

  const { filters, setFilters, filtered, specialties, toggleSort } = useProviderFilters(
    payload.providers,
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch("/api/refresh", { method: "POST" });
      await mutate();
    } finally {
      setRefreshing(false);
    }
  }, [mutate]);

  const handleExport = useCallback(() => {
    const csv = providersToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const scope = payload.activeClientId === ADMIN_CLIENT_ID ? "all-clients" : payload.activeClientId;
    a.href = url;
    a.download = `streamrev-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, payload.activeClientId]);

  const activeClientName =
    payload.clients.find((c) => c.clientId === payload.activeClientId)?.clientName ??
    (payload.role === "admin" ? "All clients" : payload.activeClientId);

  const openProvider = openNpi
    ? payload.providers.find((p) => p.npi === openNpi) ?? null
    : null;

  const isAdminAll = payload.activeClientId === ADMIN_CLIENT_ID;

  return (
    <div className="page">
      <TopBar
        role={payload.role}
        clients={payload.clients}
        activeClientId={clientId}
        activeClientName={activeClientName}
        onClientChange={setClientId}
        syncedAt={payload.syncedAt}
        onRefresh={handleRefresh}
        refreshing={refreshing || isLoading}
      />

      <main className="container">
        <div className="pagehead">
          <span className="pagehead__eyebrow">
            Provider Credentialing
            {demo && <span className="demo-badge">Demo data</span>}
          </span>
          <h1 className="pagehead__title">
            {isAdminAll ? "All clients — Admin" : activeClientName}
          </h1>

          <div className="metabar">
            <span className="metachip">
              <span
                className="metachip__dot"
                style={{ background: "var(--brand)" }}
                aria-hidden
              />
              Showing <strong>{isAdminAll ? "All clients" : activeClientName}</strong>
            </span>
            <span className="metachip">
              <strong>{payload.aggregates.providerCount}</strong> providers
            </span>
            <span className="metachip">
              <strong>{payload.aggregates.totalContractLines}</strong> contract lines
            </span>
            {isAdminAll && (
              <span className="metachip">
                <strong>{payload.clients.length}</strong> clients
              </span>
            )}
            <span className="metachip">Synced {relativeTime(payload.syncedAt)}</span>
            {userName && (
              <span className="metachip">
                Signed in as <strong>{userName}</strong>
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="banner banner--error" role="alert">
            We couldn&rsquo;t reach the credentialing sheet. Showing the last data we have — try
            Refresh. ({(error as Error).message})
          </div>
        )}

        <DiagnosticsBanner
          missingHeaders={payload.diagnostics.missingHeaders}
          unknownStatuses={payload.diagnostics.unknownStatuses}
        />

        {payload.providers.length === 0 ? (
          <div className="panel section">
            <div className="empty">
              No providers are configured for this client yet. Once rows are added to the
              credentialing sheet, they&rsquo;ll appear here automatically.
            </div>
          </div>
        ) : (
          <>
            {showClient && (
              <>
                <div className="section-head">
                  <h2 className="section-head__title">Clients</h2>
                  <p className="section-head__hint">
                    Provider count per client. Select one to drill into just that book.
                  </p>
                </div>
                <AdminClientCounts
                  providers={payload.providers}
                  clients={payload.clients}
                  onSelect={setClientId}
                />
              </>
            )}

            <PipelineRail
              pipeline={payload.aggregates.pipeline}
              total={payload.aggregates.totalContractLines}
            />

            <div className="section-head">
              <h2 className="section-head__title">At a glance</h2>
              <p className="section-head__hint">Key credentialing numbers for the current view.</p>
            </div>
            <StatCards agg={payload.aggregates} />

            <AlertsPanel alerts={payload.alerts} showClient={showClient} onSelect={setOpenNpi} />

            <ProviderTable
              providers={filtered}
              showClient={showClient}
              filters={filters}
              setFilters={setFilters}
              specialties={specialties}
              toggleSort={toggleSort}
              totalCount={payload.providers.length}
              onSelect={setOpenNpi}
              onExport={handleExport}
            />
          </>
        )}
      </main>

      {openProvider && (
        <ProviderDrawer
          provider={openProvider}
          showClient={showClient}
          onClose={() => setOpenNpi(null)}
        />
      )}
    </div>
  );
}
