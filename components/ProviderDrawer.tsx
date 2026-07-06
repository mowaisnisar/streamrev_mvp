"use client";
import { useEffect, useRef } from "react";
import type { Provider } from "@/types/credentialing";
import { overallStatus, statusMeta } from "@/lib/domain/status";
import { OverallBadge, StatusChip } from "@/components/Badge";
import { formatDate, isWithinDays } from "@/lib/ui/format";

/** Slide-over drawer with the full provider record. */
export function ProviderDrawer({
  provider,
  showClient,
  onClose,
}: {
  provider: Provider;
  showClient: boolean;
  onClose: () => void;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Move focus into the drawer on open.
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        // Simple focus trap within the drawer.
        const focusables = drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const overall = overallStatus(provider.contracts);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden />
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${provider.name ?? "Provider"} details`}
        ref={drawerRef}
      >
        <div className="drawer__head">
          <div>
            <h2 className="drawer__title">{provider.name ?? "Unnamed provider"}</h2>
            <p className="drawer__sub">
              {provider.specialty ?? "—"}
              {showClient && provider.clientName ? ` · ${provider.clientName}` : ""}
            </p>
            <OverallBadge status={overall} />
          </div>
          <button className="drawer__close" onClick={onClose} aria-label="Close" ref={closeRef}>
            ✕
          </button>
        </div>

        <div className="drawer__body">
          <div className="facts">
            <div>
              <div className="fact__label">NPI</div>
              <div className="fact__value mono">{provider.npi || "—"}</div>
            </div>
            <div>
              <div className="fact__label">Provider type</div>
              <div className="fact__value">{provider.providerType ?? "—"}</div>
            </div>
            <div>
              <div className="fact__label">Assigned specialist</div>
              <div className="fact__value">{provider.assignedSpecialist ?? "—"}</div>
            </div>
            <div>
              <div className="fact__label">PSV status</div>
              <div className="fact__value">{provider.psvStatus ?? "—"}</div>
            </div>
          </div>

          <div className="subpanel">
            <p className="subpanel__title">CAQH</p>
            <div className="kv">
              <span>CAQH ID</span>
              <span className="mono">{provider.caqhId ?? "—"}</span>
            </div>
            <div className="kv">
              <span>Status</span>
              <span>{provider.caqhStatus ?? "—"}</span>
            </div>
            <div className="kv">
              <span>Last attestation</span>
              <span>{formatDate(provider.lastAttestationDate)}</span>
            </div>
          </div>

          <p className="section-label">Payer contracts ({provider.contracts.length})</p>
          {provider.contracts.map((c, i) => {
            const meta = statusMeta(c.status);
            return (
              <div className="contract-card" key={`${c.payerName}-${i}`}>
                <div className="contract-card__head">
                  <span className="contract-card__payer">{c.payerName ?? "—"}</span>
                  <StatusChip label={meta.label} colorVar={meta.colorVar} />
                </div>
                <div className="kv">
                  <span>Submitted</span>
                  <span>{formatDate(c.submissionDate)}</span>
                </div>
                <div className="kv">
                  <span>Effective</span>
                  <span>{formatDate(c.effectiveDate)}</span>
                </div>
                <div className="kv">
                  <span>Re-credentialing due</span>
                  <span className="recred-cell">
                    {formatDate(c.recredentialingDueDate)}
                    {isWithinDays(c.recredentialingDueDate, 90) && (
                      <span className="pill-nd">Nd</span>
                    )}
                  </span>
                </div>
                {c.notes && <div className="contract-card__notes">{c.notes}</div>}
              </div>
            );
          })}

          <p className="section-label">Documents in folder</p>
          <p className="doc-placeholder">
            Document links aren&rsquo;t wired for this provider yet. When a Drive
            documents column (or the Drive API) is connected, files will appear here.
          </p>
        </div>
      </aside>
    </>
  );
}
