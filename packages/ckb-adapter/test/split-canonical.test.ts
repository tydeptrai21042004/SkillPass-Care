import { describe, expect, it } from "vitest";
import { InMemoryCareStore } from "@skillpass-care/care-store";
import type { SkillPassOwnershipSnapshot } from "@skillpass-care/core";
import type { AuthorizationEvidence } from "@skillpass-care/shared";
import { SplitServiceRightLedger, type SkillPassOwnershipPort } from "../src/index.js";

const stateRef = `ckb:testnet:0x${"9".repeat(64)}:0`;

class FakeCanonicalOwnership implements SkillPassOwnershipPort {
  state: SkillPassOwnershipSnapshot = {
    entitlementId: "cap-1",
    owner: "alice-lock",
    stateRef,
    transferable: true,
    issuerId: "seller"
  };
  async resolve(id: string) { return id === this.state.entitlementId ? structuredClone(this.state) : undefined; }
  async authorize(request: any): Promise<AuthorizationEvidence> {
    return {
      evidenceVersion: 1,
      allowed: request.claimant === this.state.owner,
      reason: request.claimant === this.state.owner ? "ALLOW" : "WRONG_OWNER",
      entitlementId: request.entitlementId,
      providerId: request.providerId,
      claimant: request.claimant,
      requestHash: request.requestHash,
      verifiedAt: "2026-09-24T00:00:00.000Z",
      expiresAt: "2026-09-24T00:05:00.000Z",
      stateRef: this.state.stateRef
    };
  }
  async assertStateRefCurrent(ref: string) {
    if (ref !== this.state.stateRef) throw new Error("STATE_REF_STALE");
  }
  async health() { return { mode: "ckb" as const, ownershipMode: "ckb" as const, ready: true }; }
}

describe("canonical SkillPass + Care attachment", () => {
  it("attaches Care state to an existing canonical SkillPass entitlement without self-issuing ownership", async () => {
    const ownership = new FakeCanonicalOwnership();
    const ledger = new SplitServiceRightLedger(ownership, new InMemoryCareStore());
    const right = await ledger.issue({
      id: "cap-1",
      issuerId: "seller",
      productCommitment: `sha256:${"a".repeat(64)}`,
      owner: "alice-lock",
      serviceClass: "STANDARD_90D",
      remainingClaims: 3,
      expiresAt: "2099-01-01T00:00:00.000Z",
      transferable: true,
      acceptedProviderIds: ["repair-a", "repair-b"]
    });
    expect(right).toMatchObject({ id: "cap-1", owner: "alice-lock", remainingClaims: 3, ownershipStateRef: stateRef });
  });

  it("rejects a Care attachment whose claimed owner or issuer disagrees with canonical SkillPass", async () => {
    const ledger = new SplitServiceRightLedger(new FakeCanonicalOwnership(), new InMemoryCareStore());
    const base = {
      id: "cap-1",
      issuerId: "seller",
      productCommitment: `sha256:${"b".repeat(64)}`,
      owner: "bob-lock",
      serviceClass: "STANDARD_90D",
      remainingClaims: 3,
      expiresAt: "2099-01-01T00:00:00.000Z",
      transferable: true,
      acceptedProviderIds: ["repair-a"]
    };
    await expect(ledger.issue(base)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(ledger.issue({ ...base, owner: "alice-lock", issuerId: "other-issuer" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
