import type { CSSProperties } from "react";
import type { OverallStatus } from "@/lib/domain/status";
import { OVERALL_TINT } from "@/lib/ui/format";

/** Overall-status pill (Action Needed / In-Network / In Progress / Not Started). */
export function OverallBadge({ status }: { status: OverallStatus }) {
  const t = OVERALL_TINT[status];
  const style: CSSProperties = {
    background: `var(${t.tint})`,
    color: `var(${t.color})`,
  };
  return (
    <span className="badge" style={style}>
      {status}
    </span>
  );
}

/** Generic colored status chip driven by a CSS color token. */
export function StatusChip({ label, colorVar }: { label: string; colorVar: string }) {
  return (
    <span
      className="badge"
      style={{
        background: "var(--surface-2)",
        color: `var(${colorVar})`,
        border: `1px solid var(${colorVar})`,
      }}
    >
      {label}
    </span>
  );
}
