"use client";
import { useState, useCallback } from "react";
import useSWR from "swr";
import type { DashboardPayload } from "@/lib/data/payload";
import { ADMIN_CLIENT_ID } from "@/types/credentialing";
import { providersToCsv } from "@/lib/domain/csv";
import { useProviderFilters } from "@/lib/ui/useProviderFilters";
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
}: {
  initial: DashboardPayload;
  userName: string;
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

  const headerLine =
    payload.activeClientId === ADMIN_CLIENT_ID
      ? `${payload.clients.length} clients · ${payload.aggregates.providerCount} providers`
      : `${payload.aggregates.providerCount} providers`;

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
          <h1 className="pagehead__title">
            {payload.activeClientId === ADMIN_CLIENT_ID
              ? "All clients — Admin"
              : activeClientName}
          </h1>
          <p className="pagehead__meta">
            {headerLine} · Source: StreamRev credentialing sheet
            {userName ? ` · Signed in as ${userName}` : ""}
          </p>
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
              <AdminClientCounts
                providers={payload.providers}
                clients={payload.clients}
                onSelect={setClientId}
              />
            )}
            <PipelineRail
              pipeline={payload.aggregates.pipeline}
              total={payload.aggregates.totalContractLines}
            />
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
