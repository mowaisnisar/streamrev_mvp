// Aggregation over a set of providers. Pure.
import type { Provider } from "@/types/credentialing";
import { statusMeta, isFullyCredentialed, type StatusBucket } from "@/lib/domain/status";

export type PipelineCounts = Record<StatusBucket, number>;

export interface Aggregates {
  providerCount: number;
  fullyCredentialedCount: number;
  fullyCredentialedPct: number; // 0-100, rounded
  inProgressContractLines: number;
  needsAttentionCount: number; // providers with any Denied/Info Requested line
  /** Contract-line counts per pipeline bucket, for the rail. */
  pipeline: PipelineCounts;
  totalContractLines: number;
}

function emptyPipeline(): PipelineCounts {
  return { notStarted: 0, inProgress: 0, needsAction: 0, inNetwork: 0, termed: 0 };
}

export function aggregate(providers: Provider[]): Aggregates {
  const pipeline = emptyPipeline();
  let fullyCredentialedCount = 0;
  let inProgressContractLines = 0;
  let needsAttentionCount = 0;
  let totalContractLines = 0;

  for (const p of providers) {
    if (isFullyCredentialed(p.contracts)) fullyCredentialedCount += 1;

    let providerNeedsAttention = false;
    for (const line of p.contracts) {
      totalContractLines += 1;
      const bucket = statusMeta(line.status).bucket;
      pipeline[bucket] += 1;
      if (bucket === "inProgress") inProgressContractLines += 1;
      if (line.status === "Denied" || line.status === "Info Requested") {
        providerNeedsAttention = true;
      }
    }
    if (providerNeedsAttention) needsAttentionCount += 1;
  }

  const providerCount = providers.length;
  const fullyCredentialedPct =
    providerCount === 0 ? 0 : Math.round((fullyCredentialedCount / providerCount) * 100);

  return {
    providerCount,
    fullyCredentialedCount,
    fullyCredentialedPct,
    inProgressContractLines,
    needsAttentionCount,
    pipeline,
    totalContractLines,
  };
}
