"use client";
import type { Provider } from "@/types/credentialing";
import { overallStatus, statusMeta } from "@/lib/domain/status";
import { OverallBadge } from "@/components/Badge";
import { formatDate, initials, isWithinDays } from "@/lib/ui/format";
import { BUCKET_META, BUCKET_ORDER } from "@/lib/ui/format";
import {
  nextRecredDate,
  type FilterState,
  type SortKey,
} from "@/lib/ui/useProviderFilters";
import type { OverallStatus } from "@/lib/domain/status";

const OVERALL_OPTIONS: (OverallStatus | "all")[] = [
  "all",
  "Action Needed",
  "In Progress",
  "In-Network",
  "Not Started",
];

function MiniRail({ provider }: { provider: Provider }) {
  const counts = BUCKET_ORDER.reduce<Record<string, number>>((acc, b) => ((acc[b] = 0), acc), {});
  for (const c of provider.contracts) counts[statusMeta(c.status).bucket] += 1;
  const total = provider.contracts.length || 1;
  return (
    <span
      className="mini-rail"
      role="img"
      aria-label="Contract status mix"
      title="This provider's contract lines by credentialing status"
    >
      {BUCKET_ORDER.map((b) =>
        counts[b] > 0 ? (
          <span
            key={b}
            style={{ width: `${(counts[b] / total) * 100}%`, background: `var(${BUCKET_META[b].colorVar})` }}
          />
        ) : null,
      )}
    </span>
  );
}

function SortHeader({
  label,
  col,
  filters,
  onSort,
}: {
  label: string;
  col: SortKey;
  filters: FilterState;
  onSort: (k: SortKey) => void;
}) {
  const active = filters.sortKey === col;
  return (
    <th aria-sort={active ? (filters.sortDir === "asc" ? "ascending" : "descending") : "none"}>
      <button onClick={() => onSort(col)}>
        {label}
        <span aria-hidden>{active ? (filters.sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

export function ProviderTable({
  providers,
  showClient,
  filters,
  setFilters,
  specialties,
  toggleSort,
  totalCount,
  onSelect,
  onExport,
}: {
  providers: Provider[];
  showClient: boolean;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  specialties: string[];
  toggleSort: (k: SortKey) => void;
  totalCount: number;
  onSelect: (npi: string) => void;
  onExport: () => void;
}) {
  return (
    <section className="panel section" aria-label="Providers">
      <div className="panel__head">
        <div className="panel__head-row">
          <span className="panel__title">Providers</span>
          <span className="count-chip">{totalCount}</span>
        </div>
        <p className="panel__hint">
          Every provider in this view and their overall credentialing status. Select a row to see
          full payer, contract, and document detail.
        </p>
      </div>
      <div className="toolbar">
        <input
          className="toolbar__search"
          type="search"
          placeholder="Search name, NPI, specialty, or payer…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          aria-label="Search providers"
        />

        <select
          className="select"
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value as FilterState["status"] }))
          }
          aria-label="Filter by status"
        >
          {OVERALL_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o === "all" ? "All statuses" : o}
            </option>
          ))}
        </select>

        <select
          className="select"
          value={filters.specialty}
          onChange={(e) => setFilters((f) => ({ ...f, specialty: e.target.value }))}
          aria-label="Filter by specialty"
        >
          <option value="all">All specialties</option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <span className="toolbar__count">
          {providers.length} of {totalCount}
        </span>
        <button className="btn btn--primary" onClick={onExport}>
          Export CSV
        </button>
      </div>

      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <SortHeader label="Provider" col="name" filters={filters} onSort={toggleSort} />
              {showClient && (
                <SortHeader label="Client" col="specialty" filters={filters} onSort={toggleSort} />
              )}
              <SortHeader label="NPI" col="npi" filters={filters} onSort={toggleSort} />
              <SortHeader label="Specialty" col="specialty" filters={filters} onSort={toggleSort} />
              <th>Pipeline</th>
              <SortHeader label="Status" col="status" filters={filters} onSort={toggleSort} />
              <SortHeader label="Re-cred due" col="recred" filters={filters} onSort={toggleSort} />
              <th aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 ? (
              <tr>
                <td colSpan={showClient ? 8 : 7}>
                  <div className="empty">No providers match these filters.</div>
                </td>
              </tr>
            ) : (
              providers.map((p) => {
                const overall = overallStatus(p.contracts);
                const recred = nextRecredDate(p);
                const isBH =
                  /behav|bh|mental|psych/i.test(p.specialty ?? "") ||
                  /behav|bh/i.test(p.providerType ?? "");
                return (
                  <tr
                    key={p.npi || p.name || Math.random()}
                    className="row-btn"
                    onClick={() => onSelect(p.npi)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${p.name ?? "provider"}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(p.npi);
                      }
                    }}
                  >
                    <td>
                      <div className="provider-cell">
                        <span className="avatar">{initials(p.name)}</span>
                        <span>
                          <span className="provider-cell__name">
                            {p.name ?? "—"}
                            {isBH && (
                              <span className="tag-bh" title="Behavioral Health provider">
                                BH
                              </span>
                            )}
                          </span>
                          <br />
                          <span className="provider-cell__type">{p.providerType ?? ""}</span>
                        </span>
                      </div>
                    </td>
                    {showClient && <td>{p.clientName ?? p.clientId}</td>}
                    <td className="mono">{p.npi || "—"}</td>
                    <td>{p.specialty ?? "—"}</td>
                    <td>
                      <MiniRail provider={p} />
                    </td>
                    <td>
                      <OverallBadge status={overall} />
                    </td>
                    <td>
                      <span className="recred-cell">
                        {formatDate(recred)}
                        {isWithinDays(recred, 90) && (
                          <span className="pill-nd" title="Re-credentialing due within 90 days">
                            Due soon
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="chevron" aria-hidden>
                      ›
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
