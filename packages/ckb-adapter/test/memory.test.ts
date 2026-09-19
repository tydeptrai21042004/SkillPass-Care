import { describe, expect, it } from "vitest";
import { InMemoryLedger } from "../src/index.js";

async function demo() {
  const ledger = new InMemoryLedger();
  const right = await ledger.resetDemo();
  return { ledger, right };
}

const claimOptions = (expectedVersion: number, serviceEventId: string, requestHash = `sha256:${"a".repeat(64)}`) => ({
  expectedVersion,
  serviceEventId,
  requestHash
});

describe("InMemoryLedger", () => {
  it("moves ownership and enforces mandatory optimistic versioning", async () => {
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
    await ledger.transfer(right.id, "alice", "bob", { expectedVersion: 1 });
    await expect(ledger.transfer(right.id, "alice", "carol", { expectedVersion: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(ledger.transfer(right.id, "bob", "bob", { expectedVersion: 2 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("enforces provider allow-list and exhausts claims", async () => {
    const { ledger, right } = await demo();
    await expect(ledger.claim(right.id, "alice", "unknown-provider", claimOptions(1, "bad-provider"))).rejects.toThrow("PROVIDER_NOT_ACCEPTED");
    await ledger.claim(right.id, "alice", "repair-a", claimOptions(1, "svc-1"));
    await ledger.claim(right.id, "alice", "repair-a", claimOptions(2, "svc-2"));
    const last = await ledger.claim(right.id, "alice", "repair-b", claimOptions(3, "svc-3"));
    expect(last.remainingClaims).toBe(0);
    await expect(ledger.claim(right.id, "alice", "repair-a", claimOptions(4, "svc-4"))).rejects.toThrow("NO_CLAIMS_LEFT");
  });

  it("makes claim retries idempotent and binds the key to the original request", async () => {
    const { ledger, right } = await demo();
    const first = await ledger.claim(right.id, "alice", "repair-a", claimOptions(1, "svc-stable", `sha256:${"a".repeat(64)}`));
    const retry = await ledger.claim(right.id, "alice", "repair-a", claimOptions(1, "svc-stable", `sha256:${"a".repeat(64)}`));
    expect(retry).toEqual(first);
    expect((await ledger.get(right.id))?.remainingClaims).toBe(2);

    await expect(ledger.claim(
      right.id,
      "alice",
      "repair-a",
      claimOptions(2, "svc-stable", `sha256:${"b".repeat(64)}`)
    )).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT", status: 409 });
  });

  it("allows only one winner for concurrent final-claim attempts", async () => {
    const ledger = new InMemoryLedger();
    const right = await ledger.issue({
      issuerId: "seller",
      productCommitment: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
      owner: "alice",
      serviceClass: "ONE_SHOT",
      remainingClaims: 1,
      expiresAt: "2099-01-01T00:00:00.000Z",
      transferable: true,
      acceptedProviderIds: ["repair-a"]
    });
    const results = await Promise.allSettled([
      ledger.claim(right.id, "alice", "repair-a", claimOptions(1, "svc-a")),
      ledger.claim(right.id, "alice", "repair-a", claimOptions(1, "svc-b"))
    ]);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((x) => x.status === "rejected")).toHaveLength(1);
  });

  it("supports suspension and irreversible revocation", async () => {
    const { ledger, right } = await demo();
    const suspended = await ledger.setStatus(right.id, "seller-demo", "SUSPENDED", { expectedVersion: 1 });
    expect(suspended.status).toBe("SUSPENDED");
    await expect(ledger.claim(right.id, "alice", "repair-a", claimOptions(2, "svc-suspended"))).rejects.toThrow("SUSPENDED");
    const active = await ledger.setStatus(right.id, "seller-demo", "ACTIVE", { expectedVersion: 2 });
    const revoked = await ledger.setStatus(right.id, "seller-demo", "REVOKED", { expectedVersion: active.version });
    expect(revoked.status).toBe("REVOKED");
    await expect(ledger.setStatus(right.id, "seller-demo", "ACTIVE", { expectedVersion: revoked.version })).rejects.toThrow("revoked");
  });

  it("filters reads by issuer, owner, and accepted provider", async () => {
    const ledger = new InMemoryLedger();
    await ledger.issue({
      issuerId: "issuer-a", productCommitment: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", owner: "alice", serviceClass: "A",
      remainingClaims: 1, expiresAt: "2099-01-01T00:00:00.000Z", transferable: true,
      acceptedProviderIds: ["repair-a"]
    });
    await ledger.issue({
      issuerId: "issuer-b", productCommitment: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", owner: "bob", serviceClass: "B",
      remainingClaims: 1, expiresAt: "2099-01-01T00:00:00.000Z", transferable: true,
      acceptedProviderIds: ["repair-b"]
    });
    expect(await ledger.list({ owner: "alice" })).toHaveLength(1);
    expect(await ledger.list({ issuerId: "issuer-b" })).toHaveLength(1);
    expect(await ledger.list({ providerId: "repair-a" })).toHaveLength(1);
  });

  it("rejects malformed issuance", async () => {
    const ledger = new InMemoryLedger();
    await expect(ledger.issue({
      issuerId: "seller",
      productCommitment: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      owner: "alice",
      serviceClass: "TEST",
      remainingClaims: 0,
      expiresAt: "2099-01-01T00:00:00.000Z",
      transferable: true,
      acceptedProviderIds: ["repair-a"]
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
