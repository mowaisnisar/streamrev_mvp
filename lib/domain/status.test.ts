import { describe, it, expect } from "vitest";
import type { ContractLine } from "@/types/credentialing";
import { overallStatus, isFullyCredentialed } from "@/lib/domain/status";

function line(status: string): ContractLine {
  return {
    payerName: "Payer",
    status,
    submissionDate: null,
    effectiveDate: null,
    recredentialingDueDate: null,
    notes: null,
    lastUpdated: null,
  };
}

describe("overallStatus", () => {
  it("returns Not Started for no contracts", () => {
    expect(overallStatus([])).toBe("Not Started");
  });

  it("returns Action Needed if any line is Denied", () => {
    expect(overallStatus([line("Effective"), line("Denied")])).toBe("Action Needed");
  });

  it("returns Action Needed if any line is Info Requested (over In Progress)", () => {
    expect(overallStatus([line("Under Review"), line("Info Requested")])).toBe("Action Needed");
  });

  it("returns In-Network only if all lines are Effective/Approved", () => {
    expect(overallStatus([line("Effective"), line("Approved/In-Network")])).toBe("In-Network");
  });

  it("returns In Progress if some active but not all in-network", () => {
    expect(overallStatus([line("Effective"), line("Under Review")])).toBe("In Progress");
  });

  it("returns Not Started if all lines are Not Started", () => {
    expect(overallStatus([line("Not Started"), line("Not Started")])).toBe("Not Started");
  });

  it("treats Termed-only as Not Started (no active/in-network line)", () => {
    expect(overallStatus([line("Termed")])).toBe("Not Started");
  });
});

describe("isFullyCredentialed", () => {
  it("is true when every line is Effective or Approved/In-Network", () => {
    expect(isFullyCredentialed([line("Effective"), line("Approved/In-Network")])).toBe(true);
  });

  it("is false when any line is not in-network", () => {
    expect(isFullyCredentialed([line("Effective"), line("Under Review")])).toBe(false);
  });

  it("is false for an empty contract list", () => {
    expect(isFullyCredentialed([])).toBe(false);
  });
});
