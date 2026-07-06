"use client";
import { useMemo, useState } from "react";
import type { Provider } from "@/types/credentialing";
import { overallStatus, type OverallStatus } from "@/lib/domain/status";

export type SortKey = "name" | "npi" | "specialty" | "status" | "recred";
export type SortDir = "asc" | "desc";

export interface FilterState {
  search: string;
  status: OverallStatus | "all";
  specialty: string | "all";
  sortKey: SortKey;
  sortDir: SortDir;
}

/** Earliest re-credentialing date across a provider's lines (for the column + sort). */
export function nextRecredDate(p: Provider): string | null {
  const dates = p.contracts.map((c) => c.recredentialingDueDate).filter((d): d is string => !!d);
  return dates.length ? dates.sort()[0] : null;
}

function matchesSearch(p: Provider, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  if ((p.name ?? "").toLowerCase().includes(needle)) return true;
  if (p.npi.toLowerCase().includes(needle)) return true;
  if ((p.specialty ?? "").toLowerCase().includes(needle)) return true;
  return p.contracts.some((c) => (c.payerName ?? "").toLowerCase().includes(needle));
}

export function useProviderFilters(providers: Provider[]) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
    specialty: "all",
    sortKey: "name",
    sortDir: "asc",
  });

  const specialties = useMemo(() => {
    const set = new Set<string>();
    for (const p of providers) if (p.specialty) set.add(p.specialty);
    return [...set].sort();
  }, [providers]);

  const filtered = useMemo(() => {
    const withStatus = providers.map((p) => ({ p, overall: overallStatus(p.contracts) }));
    const result = withStatus.filter(({ p, overall }) => {
      if (!matchesSearch(p, filters.search)) return false;
      if (filters.status !== "all" && overall !== filters.status) return false;
      if (filters.specialty !== "all" && p.specialty !== filters.specialty) return false;
      return true;
    });

    const dir = filters.sortDir === "asc" ? 1 : -1;
    result.sort((a, b) => {
      switch (filters.sortKey) {
        case "npi":
          return a.p.npi.localeCompare(b.p.npi) * dir;
        case "specialty":
          return (a.p.specialty ?? "").localeCompare(b.p.specialty ?? "") * dir;
        case "status":
          return a.overall.localeCompare(b.overall) * dir;
        case "recred": {
          const ad = nextRecredDate(a.p) ?? "9999";
          const bd = nextRecredDate(b.p) ?? "9999";
          return ad.localeCompare(bd) * dir;
        }
        case "name":
        default:
          return (a.p.name ?? "").localeCompare(b.p.name ?? "") * dir;
      }
    });

    return result.map((r) => r.p);
  }, [providers, filters]);

  function toggleSort(key: SortKey) {
    setFilters((f) =>
      f.sortKey === key
        ? { ...f, sortDir: f.sortDir === "asc" ? "desc" : "asc" }
        : { ...f, sortKey: key, sortDir: "asc" },
    );
  }

  return { filters, setFilters, filtered, specialties, toggleSort };
}
