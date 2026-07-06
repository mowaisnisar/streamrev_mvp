import type { PipelineCounts } from "@/lib/domain/aggregate";
import { BUCKET_ORDER, BUCKET_META } from "@/lib/ui/format";

/** The signature segmented "Credentialing pipeline" rail over contract-line buckets. */
export function PipelineRail({ pipeline, total }: { pipeline: PipelineCounts; total: number }) {
  const denom = total > 0 ? total : 1;

  return (
    <section className="rail" aria-label="Credentialing pipeline">
      <div className="rail__head">
        <span className="rail__title">Credentialing pipeline</span>
        <span className="rail__total">{total} contract lines</span>
      </div>

      <div className="rail__bar" role="img" aria-label="Pipeline distribution by status">
        {BUCKET_ORDER.map((bucket) => {
          const count = pipeline[bucket];
          if (count === 0) return null;
          const pct = (count / denom) * 100;
          return (
            <div
              key={bucket}
              className="rail__seg"
              style={{ width: `${pct}%`, background: `var(${BUCKET_META[bucket].colorVar})` }}
              title={`${BUCKET_META[bucket].label}: ${count}`}
            />
          );
        })}
      </div>

      <div className="rail__legend">
        {BUCKET_ORDER.map((bucket) => (
          <span className="legend-item" key={bucket}>
            <span
              className="legend-dot"
              style={{ background: `var(${BUCKET_META[bucket].colorVar})` }}
            />
            {BUCKET_META[bucket].label} <strong>{pipeline[bucket]}</strong>
          </span>
        ))}
      </div>
    </section>
  );
}
