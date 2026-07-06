import { describe, it, expect } from "vitest";
import { groupProviders } from "@/lib/domain/providers";
import { buildAlerts, RECRED_WINDOW_DAYS } from "@/lib/domain/alerts";
import { row, TODAY } from "@/lib/domain/fixtures";

describe("buildAlerts", () => {
  it("emits high-severity Denied and Info Requested alerts", () => {
    const providers = groupProviders([
      row({ NPI: "1", credentialing_status: "Denied", payer_name: "UHC" }),
      row({ NPI: "2", credentialing_status: "Info Requested", payer_name: "Aetna" }),
    ]);
    const alerts = buildAlerts(providers, TODAY);
    const types = alerts.map((a) => a.type);
    expect(types).toContain("Denied");
    expect(types).toContain("Info Requested");
    expect(alerts.every((a) => a.severity === "high")).toBe(true);
  });

  it("emits a CAQH alert for Re-attestation Needed", () => {
    const providers = groupProviders([
      row({ NPI: "1", caqh_status: "Re-attestation Needed", credentialing_status: "Effective" }),
    ]);
    const alerts = buildAlerts(providers, TODAY);
    expect(alerts.some((a) => a.type === "CAQH Attestation")).toBe(true);
  });

  describe("90-day re-credentialing boundary", () => {
    // TODAY = 2026-01-15
    const inNetwork = { credentialing_status: "Effective" as const };

    it("alerts when due exactly 90 days out (inclusive)", () => {
      // 2026-01-15 + 90 days = 2026-04-15
      const providers = groupProviders([
        row({ NPI: "1", ...inNetwork, recredentialing_due_date: "2026-04-15" }),
      ]);
      const alerts = buildAlerts(providers, TODAY).filter((a) => a.type === "Recredentialing Due");
      expect(alerts).toHaveLength(1);
    });

    it("does NOT alert when due 91 days out (outside window)", () => {
      const providers = groupProviders([
        row({ NPI: "1", ...inNetwork, recredentialing_due_date: "2026-04-16" }),
      ]);
      const alerts = buildAlerts(providers, TODAY).filter((a) => a.type === "Recredentialing Due");
      expect(alerts).toHaveLength(0);
    });

    it("does NOT alert for a past-due date (negative days)", () => {
      const providers = groupProviders([
        row({ NPI: "1", ...inNetwork, recredentialing_due_date: "2026-01-14" }),
      ]);
      const alerts = buildAlerts(providers, TODAY).filter((a) => a.type === "Recredentialing Due");
      expect(alerts).toHaveLength(0);
    });

    it("does NOT alert for a non-in-network line even if due soon", () => {
      const providers = groupProviders([
        row({ NPI: "1", credentialing_status: "Under Review", recredentialing_due_date: "2026-02-01" }),
      ]);
      const alerts = buildAlerts(providers, TODAY).filter((a) => a.type === "Recredentialing Due");
      expect(alerts).toHaveLength(0);
    });
  });

  it("sorts high-severity alerts before medium", () => {
    const providers = groupProviders([
      row({ NPI: "1", credentialing_status: "Effective", recredentialing_due_date: "2026-02-01" }), // med
      row({ NPI: "2", credentialing_status: "Denied" }), // high
    ]);
    const alerts = buildAlerts(providers, TODAY);
    expect(alerts[0].severity).toBe("high");
  });

  it("RECRED_WINDOW_DAYS is 90", () => {
    expect(RECRED_WINDOW_DAYS).toBe(90);
  });
});
