import { describe, it, expect } from "vitest";
import { groupProviders } from "@/lib/domain/providers";
import { aggregate } from "@/lib/domain/aggregate";
import { row } from "@/lib/domain/fixtures";

describe("aggregate", () => {
  it("counts providers, fully-credentialed %, in-progress lines, and pipeline buckets", () => {
    const rows = [
      // Provider A: fully credentialed (2 in-network lines)
      row({ NPI: "1", provider_name: "A", payer_name: "Aetna", credentialing_status: "Effective" }),
      row({
        NPI: "1",
        provider_name: "A",
        payer_name: "Cigna",
        credentialing_status: "Approved/In-Network",
      }),
      // Provider B: in progress + needs action
      row({ NPI: "2", provider_name: "B", payer_name: "Aetna", credentialing_status: "Under Review" }),
      row({ NPI: "2", provider_name: "B", payer_name: "UHC", credentialing_status: "Denied" }),
      // Provider C: not started
      row({ NPI: "3", provider_name: "C", payer_name: "Aetna", credentialing_status: "Not Started" }),
    ];
    const providers = groupProviders(rows);
    const agg = aggregate(providers);

    expect(agg.providerCount).toBe(3);
    expect(agg.fullyCredentialedCount).toBe(1); // only A
    expect(agg.fullyCredentialedPct).toBe(33); // 1/3 rounded
    expect(agg.inProgressContractLines).toBe(1); // B's Under Review
    expect(agg.needsAttentionCount).toBe(1); // B has a Denied line
    expect(agg.totalContractLines).toBe(5);
    expect(agg.pipeline).toEqual({
      notStarted: 1, // C
      inProgress: 1, // B Under Review
      needsAction: 1, // B Denied
      inNetwork: 2, // A x2
      termed: 0,
    });
  });

  it("handles an empty provider set", () => {
    const agg = aggregate([]);
    expect(agg.providerCount).toBe(0);
    expect(agg.fullyCredentialedPct).toBe(0);
    expect(agg.totalContractLines).toBe(0);
  });
});
