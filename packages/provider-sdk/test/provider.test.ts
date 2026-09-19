import { describe, expect, it } from "vitest";
import { InMemoryLedger } from "@skillpass/ckb-adapter";
import { createHmacEvidenceSigner, ProviderVerifier, verifyHmacAuthorizationEvidence } from "../src/index.js";

describe("ProviderVerifier", () => {
  it("follows ownership after transfer and emits signed, request-bound evidence", async () => {
    const ledger = new InMemoryLedger();
    const right = await ledger.resetDemo();
    const providerA = new ProviderVerifier({
      providerId: "repair-a",
      ledger,
      evidenceSigner: createHmacEvidenceSigner("repair-a", "provider-a-secret")
    });
    const providerB = new ProviderVerifier({ providerId: "repair-b", ledger });

    const initial = await providerA.verify({ entitlementId: right.id, claimant: "alice", challengeId: "challenge-a" });
    expect(initial.allowed).toBe(true);
    expect(initial.providerId).toBe("repair-a");
    expect(initial.requestHash).toMatch(/^sha256:/);
    expect(initial.stateRef).toBe(`entitlement:${right.id}:v1`);
    expect(verifyHmacAuthorizationEvidence(initial, "provider-a-secret")).toBe(true);
    expect(verifyHmacAuthorizationEvidence(initial, "wrong-secret")).toBe(false);

    await ledger.transfer(right.id, "alice", "bob", { expectedVersion: 1 });
    expect((await providerA.verify({ entitlementId: right.id, claimant: "alice" })).reason).toBe("WRONG_OWNER");
    expect((await providerA.verify({ entitlementId: right.id, claimant: "bob" })).allowed).toBe(true);
    expect((await providerB.verify({ entitlementId: right.id, claimant: "bob" })).allowed).toBe(true);
  });
});
