import type { Aggregates } from "@/lib/domain/aggregate";

/** Four summary stat cards. */
export function StatCards({ agg }: { agg: Aggregates }) {
  return (
    <section className="stats" aria-label="Summary statistics">
      <div className="stat">
        <div className="stat__label">Providers</div>
        <div className="stat__value">{agg.providerCount}</div>
        <div className="stat__sub">in this view</div>
      </div>

      <div className="stat stat--accent">
        <div className="stat__label">Fully credentialed</div>
        <div className="stat__value">{agg.fullyCredentialedCount}</div>
        <div className="stat__sub">{agg.fullyCredentialedPct}% of providers</div>
      </div>

      <div className="stat">
        <div className="stat__label">Contracts in progress</div>
        <div className="stat__value">{agg.inProgressContractLines}</div>
        <div className="stat__sub">contract lines under way</div>
      </div>

      <div className="stat stat--warn">
        <div className="stat__label">Needs attention</div>
        <div className="stat__value">{agg.needsAttentionCount}</div>
        <div className="stat__sub">providers with denials / info requests</div>
      </div>
    </section>
  );
}
