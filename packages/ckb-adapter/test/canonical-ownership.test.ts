import { describe, expect, it } from "vitest";
import { CanonicalSkillPassOwnership, type CanonicalSkillPassVerifierBinding } from "../src/index.js";

const stateRef = `ckb:testnet:0x${"1".repeat(64)}:0`;

function binding(overrides: Partial<CanonicalSkillPassVerifierBinding> = {}): CanonicalSkillPassVerifierBinding {
  return {
    resolve: async (entitlementId: string) => ({ entitlementId, owner: "alice", stateRef, transferable: true }),
    verify: async (request: any) => ({
      evidenceVersion: 1 as const,
      allowed: true,
      reason: "ALLOW" as const,
      entitlementId: request.entitlementId,
      providerId: request.providerId,
      claimant: request.claimant,
      requestHash: request.requestHash,
      verifiedAt: "2026-09-24T00:00:00.000Z",
      expiresAt: "2026-09-24T00:05:00.000Z",
      stateRef
    }),
    isStateRefLive: async () => true,
    health: async () => ({ ready: true, detail: "test canonical binding" }),
    ...overrides
  };
}

describe("CanonicalSkillPassOwnership", () => {
  it("requires canonical CKB outpoints and exposes CKB ownership health", async () => {
    const ownership = new CanonicalSkillPassOwnership(binding());
    expect((await ownership.resolve("ent-1"))?.stateRef).toBe(stateRef);
    expect(await ownership.health()).toMatchObject({ ready: true, ownershipMode: "ckb" });
  });

  it("rejects canonical verifier evidence that is not bound to the exact Care request", async () => {
    const ownership = new CanonicalSkillPassOwnership(binding({
      verify: async (request: any) => ({
        evidenceVersion: 1 as const,
        allowed: true,
        reason: "ALLOW" as const,
        entitlementId: request.entitlementId,
        providerId: "different-provider",
        claimant: request.claimant,
        requestHash: request.requestHash,
        verifiedAt: "2026-09-24T00:00:00.000Z",
        expiresAt: "2026-09-24T00:05:00.000Z",
        stateRef
      })
    }));
    await expect(ownership.authorize({
      entitlementId: "ent-1",
      providerId: "repair-a",
      claimant: "alice",
      requestHash: "sha256:test"
    })).rejects.toMatchObject({ code: "LEDGER_UNAVAILABLE" });
  });

  it("fails closed when a previously authorized state reference is no longer live", async () => {
    const ownership = new CanonicalSkillPassOwnership(binding({ isStateRefLive: async () => false }));
    await expect(ownership.assertStateRefCurrent(stateRef)).rejects.toMatchObject({ code: "STATE_REF_STALE" });
  });
});
