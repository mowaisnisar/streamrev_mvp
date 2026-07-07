import type { Alert } from "@/lib/domain/alerts";
import { formatDate } from "@/lib/ui/format";

/** Severity-colored alerts list; each row opens the provider drawer. */
export function AlertsPanel({
  alerts,
  showClient,
  onSelect,
}: {
  alerts: Alert[];
  showClient: boolean;
  onSelect: (npi: string) => void;
}) {
  return (
    <section className="alerts" aria-label="Alerts">
      <div className="alerts__head">
        <div className="alerts__head-row">
          Needs attention
          {alerts.length > 0 && <span className="alerts__count">{alerts.length}</span>}
        </div>
        <p className="alerts__hint">
          Denials, information requests, and re-credentialing due soon. Select one to open the
          provider.
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="empty">Nothing needs attention right now. 🎉</div>
      ) : (
        <div className="alerts__list">
          {alerts.map((a) => (
            <button
              key={a.id}
              className="alert"
              onClick={() => onSelect(a.providerNpi)}
              aria-label={`${a.providerName ?? "Provider"}: ${a.message}`}
            >
              <span className={`alert__sev alert__sev--${a.severity}`} aria-hidden />
              <span className="alert__body">
                <span className="alert__msg">{a.providerName ?? "Provider"}</span>
                <span className="alert__meta">
                  {a.message}
                  {showClient && a.clientName ? ` · ${a.clientName}` : ""}
                </span>
              </span>
              {a.date && <span className="alert__date">{formatDate(a.date)}</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
