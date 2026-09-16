import { describe, expect, it } from "vitest";
import { InMemoryLedger } from "../src/index.js";

describe("InMemoryLedger lifecycle", () => {
  it("moves ownership and rejects stale transfer sources", async () => {
    const ledger = new InMemoryLedger();
    const right = await ledger.resetDemo();
    const moved = await ledger.transfer(right.id, "alice", "bob");
    expect(moved.owner).toBe("bob");
    await expect(ledger.transfer(right.id, "alice", "carol")).rejects.toThrow();
  });

  it("decrements claims", async () => {
    const ledger = new InMemoryLedger();
    const right = await ledger.resetDemo();
    const claimed = await ledger.claim(right.id, "alice", "repair-a");
    expect(claimed.remainingClaims).toBe(2);
  });
});
