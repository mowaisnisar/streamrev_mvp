import { describe, it, expect } from "vitest";
import { groupProviders } from "@/lib/domain/providers";
import { providersToCsv, CSV_COLUMNS } from "@/lib/domain/csv";
import { row } from "@/lib/domain/fixtures";

describe("providersToCsv", () => {
  it("emits a header plus one row per contract line", () => {
    const providers = groupProviders([
      row({ NPI: "1", payer_name: "Aetna" }),
      row({ NPI: "1", payer_name: "Cigna" }),
    ]);
    const csv = providersToCsv(providers);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(CSV_COLUMNS.join(","));
    expect(lines).toHaveLength(3); // header + 2 contract lines
  });

  it("escapes cells containing commas or quotes", () => {
    const providers = groupProviders([
      row({ NPI: "1", notes: 'Needs W-9, and "signed" form' }),
    ]);
    const csv = providersToCsv(providers);
    expect(csv).toContain('"Needs W-9, and ""signed"" form"');
  });
});
