import { describe, it, expect } from "vitest";
import { groupProviders } from "@/lib/domain/providers";
import { scopeProviders } from "@/lib/domain/scope";
import { row } from "@/lib/domain/fixtures";
import { ADMIN_CLIENT_ID } from "@/types/credentialing";

// Multi-tenancy security tests. These enforce CONTEXT.md's non-negotiable rule:
// a client session can never load another tenant's rows via any route.
const all = groupProviders([
  row({ NPI: "1", client_id: "clientA", client_name: "Client A", provider_name: "A-Doc" }),
  row({ NPI: "2", client_id: "clientB", client_name: "Client B", provider_name: "B-Doc" }),
  row({ NPI: "3", client_id: "clientC", client_name: "Client C", provider_name: "C-Doc" }),
]);
const validIds = new Set(["clientA", "clientB", "clientC"]);

describe("scopeProviders — tenancy enforcement", () => {
  it("a client sees ONLY their own client's providers", () => {
    const { providers, activeClientId } = scopeProviders(all, "client", "clientA", null, validIds);
    expect(activeClientId).toBe("clientA");
    expect(providers.map((p) => p.clientId)).toEqual(["clientA"]);
  });

  it("a client CANNOT widen scope by requesting another client_id", () => {
    // Simulates a tampered request ?clientId=clientB from a clientA session.
    const { providers } = scopeProviders(all, "client", "clientA", "clientB", validIds);
    expect(providers.every((p) => p.clientId === "clientA")).toBe(true);
    expect(providers.some((p) => p.clientId === "clientB")).toBe(false);
  });

  it("a client requesting ALL still only sees their own", () => {
    const { providers } = scopeProviders(all, "client", "clientA", ADMIN_CLIENT_ID, validIds);
    expect(providers.map((p) => p.clientId)).toEqual(["clientA"]);
  });

  it("an admin with no request sees every client", () => {
    const { providers, activeClientId } = scopeProviders(all, "admin", ADMIN_CLIENT_ID, null, validIds);
    expect(activeClientId).toBe(ADMIN_CLIENT_ID);
    expect(providers).toHaveLength(3);
  });

  it("an admin can narrow to one valid client", () => {
    const { providers, activeClientId } = scopeProviders(all, "admin", ADMIN_CLIENT_ID, "clientB", validIds);
    expect(activeClientId).toBe("clientB");
    expect(providers.map((p) => p.clientId)).toEqual(["clientB"]);
  });

  it("an admin requesting an unknown client_id falls back to all (no crash, no injection)", () => {
    const { providers, activeClientId } = scopeProviders(all, "admin", ADMIN_CLIENT_ID, "clientZ", validIds);
    expect(activeClientId).toBe(ADMIN_CLIENT_ID);
    expect(providers).toHaveLength(3);
  });
});
