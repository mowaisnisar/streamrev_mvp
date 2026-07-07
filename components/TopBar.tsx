"use client";
import { signOut } from "next-auth/react";
import type { ClientRef } from "@/lib/auth/tenancy";
import { ADMIN_CLIENT_ID, type Role } from "@/types/credentialing";
import { relativeTime } from "@/lib/ui/format";

/** Top bar: brand, client switcher (admin) or client badge, sync/refresh, sign out. */
export function TopBar({
  role,
  clients,
  activeClientId,
  activeClientName,
  onClientChange,
  syncedAt,
  onRefresh,
  refreshing,
}: {
  role: Role;
  clients: ClientRef[];
  activeClientId: string;
  activeClientName: string;
  onClientChange: (clientId: string) => void;
  syncedAt: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <header className="topbar">
      <div className="container topbar__inner">
        <span className="brandmark">
          <span className="brandmark__dot" aria-hidden />
          StreamRev
          <span className="brandmark__tag">Credentialing</span>
        </span>

        {role === "admin" ? (
          <label>
            <span className="sr-only">Select client</span>
            <select
              className="select"
              value={activeClientId}
              onChange={(e) => onClientChange(e.target.value)}
              aria-label="Select client"
            >
              <option value={ADMIN_CLIENT_ID}>All clients — Admin</option>
              {clients.map((c) => (
                <option key={c.clientId} value={c.clientId}>
                  {c.clientName}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="client-badge">{activeClientName}</span>
        )}

        <span className="topbar__spacer" />

        <div className="sync">
          <span aria-live="polite">Synced {relativeTime(syncedAt)}</span>
          <button
            className="sync__btn"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh data"
          >
            <RefreshIcon spinning={refreshing} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <button className="sync__btn" onClick={() => signOut({ redirectTo: "/signin" })}>
          Sign out
        </button>
      </div>
    </header>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={spinning ? "spin" : undefined}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}
