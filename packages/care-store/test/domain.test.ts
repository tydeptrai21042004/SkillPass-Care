import { describe, expect, it } from "vitest";
import { applyCareConsumption, applyCareStatusTransition, initializeCareCoverage } from "../src/index.js";

const hash = (c: string) => `sha256:${c.repeat(64)}`;
const context = {
  claimant: "alice",
  providerId: "repair-a",
  authorizationStateRef: `ckb:testnet:0x${"1".repeat(64)}:0`,
  authorizationEvidenceHash: hash("2"),
  assertStateRefCurrent: async () => undefined
};

function standard() {
  return initializeCareCoverage({
    id: "ent-1",
    issuerId: "seller",
    productCommitment: hash("a"),
    serviceClass: "STANDARD_90D",
    remainingClaims: 3,
    expiresAt: "2099-01-01T00:00:00.000Z",
    transferable: true,
    acceptedProviderIds: ["repair-b", "repair-a"]
  }, "ent-1", new Date("2026-09-24T00:00:00.000Z"));
}

describe("shared Care-store domain transitions", () => {
  it("normalizes one initial coverage representation for memory and PostgreSQL", () => {
    const coverage = standard();
    expect(coverage.acceptedProviderIds).toEqual(["repair-a", "repair-b"]);
    expect(coverage.productCommitment).toBe(hash("a"));
    expect(coverage.version).toBe(1);
    expect(coverage.status).toBe("ACTIVE");
  });

  it("rejects malformed initial state before either store commits it", () => {
    expect(() => initializeCareCoverage({
      id: "ent-invalid",
      issuerId: "seller",
      productCommitment: hash("a"),
      serviceClass: "STANDARD_90D",
      remainingClaims: 0,
      expiresAt: "2099-01-01T00:00:00.000Z",
      transferable: true,
      acceptedProviderIds: ["repair-a"]
    }, "ent-invalid")).toThrow("remainingClaims");
  });

  it("applies Care-plan service rules in the shared transition", () => {
    expect(() => applyCareConsumption(standard(), context, {
      expectedVersion: 1,
      serviceEventId: "evt-battery",
      requestHash: hash("3"),
      serviceType: "BATTERY_REPLACEMENT",
      unitsConsumed: 1
    })).toThrow("not covered");
  });

  it("produces the same auditable event data as the resulting coverage transition", () => {
    const result = applyCareConsumption(standard(), context, {
      expectedVersion: 1,
      serviceEventId: "evt-repair",
      requestHash: hash("4"),
      serviceType: "REPAIR",
      unitsConsumed: 2
    }, new Date("2026-09-24T01:00:00.000Z"));
    expect(result.coverage.remainingClaims).toBe(1);
    expect(result.coverage.version).toBe(2);
    expect(result.event).toMatchObject({
      entitlementVersionBefore: 1,
      entitlementVersionAfter: 2,
      remainingClaimsAfter: 1,
      serviceType: "REPAIR",
      unitsConsumed: 2
    });
  });

  it("uses the shared irreversible-revocation rule for every store", () => {
    const revoked = applyCareStatusTransition(standard(), "seller", "REVOKED", { expectedVersion: 1 });
    expect(revoked.status).toBe("REVOKED");
    expect(() => applyCareStatusTransition(revoked, "seller", "ACTIVE", { expectedVersion: 2 })).toThrow("revoked");
  });
});
