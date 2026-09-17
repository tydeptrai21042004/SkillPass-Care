import { describe, expect, it } from "vitest";
import { InMemoryLedger } from "@skillpass/ckb-adapter";
import { ProviderVerifier } from "../src/index.js";

describe("ProviderVerifier", () => {
  it("follows ownership after transfer and emits evidence", async () => {
    const ledger = new InMemoryLedger();
    const right = await ledger.resetDemo();
    const providerA = new ProviderVerifier({ providerId: "repair-a", ledger });
    const providerB = new ProviderVerifier({ providerId: "repair-b", ledger });

    const initial = await providerA.verify({ entitlementId: right.id, claimant: "alice" });
    expect(initial.allowed).toBe(true);
    expect(initial.providerId).toBe("repair-a");
    expect(initial.verifiedAt).toBeTruthy();

    await ledger.transfer(right.id, "alice", "bob");
    expect((await providerA.verify({ entitlementId: right.id, claimant: "alice" })).reason).toBe("WRONG_OWNER");
    expect((await providerA.verify({ entitlementId: right.id, claimant: "bob" })).allowed).toBe(true);
    expect((await providerB.verify({ entitlementId: right.id, claimant: "bob" })).allowed).toBe(true);
  });
});
