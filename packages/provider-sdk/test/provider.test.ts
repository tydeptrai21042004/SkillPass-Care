import { describe, expect, it } from "vitest";
import { InMemoryLedger } from "@skillpass/ckb-adapter";
import { ProviderVerifier } from "../src/index.js";

describe("ProviderVerifier", () => {
  it("follows ownership after transfer", async () => {
    const ledger = new InMemoryLedger();
    const right = await ledger.resetDemo();
    const provider = new ProviderVerifier({ providerId: "repair-a", ledger });

    expect((await provider.verify({ entitlementId: right.id, claimant: "alice" })).allowed).toBe(true);
    await ledger.transfer(right.id, "alice", "bob");
    expect((await provider.verify({ entitlementId: right.id, claimant: "alice" })).reason).toBe("WRONG_OWNER");
    expect((await provider.verify({ entitlementId: right.id, claimant: "bob" })).allowed).toBe(true);
  });
});
