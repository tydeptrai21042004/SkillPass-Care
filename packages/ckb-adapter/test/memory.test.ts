import { describe, expect, it } from "vitest";
import { InMemoryLedger } from "../src/index.js";

async function demo() {
  const ledger = new InMemoryLedger();
  const right = await ledger.resetDemo();
  return { ledger, right };
}

describe("InMemoryLedger", () => {
  it("moves ownership and enforces optimistic versioning", async () => {
    const { ledger, right } = await demo();
    const moved = await ledger.transfer(right.id, "alice", "bob", { expectedVersion: 1 });
    expect(moved.owner).toBe("bob");
    expect(moved.version).toBe(2);
    await expect(ledger.transfer(right.id, "bob", "carol", { expectedVersion: 1 })).rejects.toMatchObject({
      code: "VERSION_CONFLICT",
      status: 409
    });
  });

  it("rejects stale owners and self-transfer", async () => {
    const { ledger, right } = await demo();
    await ledger.transfer(right.id, "alice", "bob");
    await expect(ledger.transfer(right.id, "alice", "carol")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(ledger.transfer(right.id, "bob", "bob")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("enforces provider allow-list and exhausts claims", async () => {
    const { ledger, right } = await demo();
    await expect(ledger.claim(right.id, "alice", "unknown-provider")).rejects.toThrow("PROVIDER_NOT_ACCEPTED");
    await ledger.claim(right.id, "alice", "repair-a");
    await ledger.claim(right.id, "alice", "repair-a");
    const last = await ledger.claim(right.id, "alice", "repair-b");
    expect(last.remainingClaims).toBe(0);
    await expect(ledger.claim(right.id, "alice", "repair-a")).rejects.toThrow("NO_CLAIMS_LEFT");
  });

  it("allows only one winner for concurrent final-claim attempts", async () => {
    const ledger = new InMemoryLedger();
    const right = await ledger.issue({
      issuerId: "seller",
      productHash: "sha256:one-claim",
      owner: "alice",
      serviceClass: "ONE_SHOT",
      remainingClaims: 1,
      expiresAt: "2099-01-01T00:00:00.000Z",
      transferable: true,
      acceptedProviderIds: ["repair-a"]
    });
    const results = await Promise.allSettled([
      ledger.claim(right.id, "alice", "repair-a"),
      ledger.claim(right.id, "alice", "repair-a")
    ]);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((x) => x.status === "rejected")).toHaveLength(1);
  });

  it("supports suspension and irreversible revocation", async () => {
    const { ledger, right } = await demo();
    const suspended = await ledger.setStatus(right.id, "seller-demo", "SUSPENDED", { expectedVersion: 1 });
    expect(suspended.status).toBe("SUSPENDED");
    await expect(ledger.claim(right.id, "alice", "repair-a")).rejects.toThrow("SUSPENDED");
    const active = await ledger.setStatus(right.id, "seller-demo", "ACTIVE");
    const revoked = await ledger.setStatus(right.id, "seller-demo", "REVOKED", { expectedVersion: active.version });
    expect(revoked.status).toBe("REVOKED");
    await expect(ledger.setStatus(right.id, "seller-demo", "ACTIVE")).rejects.toThrow("revoked");
  });

  it("rejects malformed issuance", async () => {
    const ledger = new InMemoryLedger();
    await expect(ledger.issue({
      issuerId: "seller",
      productHash: "sha256:x",
      owner: "alice",
      serviceClass: "TEST",
      remainingClaims: 0,
      expiresAt: "2099-01-01T00:00:00.000Z",
      transferable: true,
      acceptedProviderIds: ["repair-a"]
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
