import { describe, expect, it } from "vitest";
import { SkillPassError } from "@skillpass-care/shared";
import {
  claimRequestHash,
  createPilotOwnerProof,
  issueOwnerChallenge,
  ownerProofRequestHash,
  verifyChallengeToken,
  verifyPilotOwnerProof
} from "../src/owner-proof.js";

const CHALLENGE_SECRET = "challenge-secret-that-is-long-enough-for-tests";
const ALICE_SECRET = "alice-owner-secret-that-is-long-enough";

function expectSkillPassCode(fn: () => unknown, code: string): void {
  try {
    fn();
    throw new Error("expected SkillPassError");
  } catch (error) {
    expect(error).toBeInstanceOf(SkillPassError);
    expect((error as SkillPassError).code).toBe(code);
  }
}

describe("owner proof", () => {
  it("accepts a valid proof and rejects the wrong owner secret", () => {
    const challenge = issueOwnerChallenge({
      entitlementId: "ent-1",
      providerId: "repair-a",
      claimant: "alice",
      action: "VERIFY",
      secret: CHALLENGE_SECRET,
      ttlSeconds: 120,
      now: new Date("2026-09-20T00:00:00.000Z")
    });

    const verified = verifyChallengeToken(
      challenge.token,
      CHALLENGE_SECRET,
      new Date("2026-09-20T00:00:30.000Z")
    );
    const proof = createPilotOwnerProof(verified, ALICE_SECRET);

    expect(() => verifyPilotOwnerProof(verified, proof, ALICE_SECRET)).not.toThrow();
    expectSkillPassCode(
      () => verifyPilotOwnerProof(verified, proof, "wrong-owner-secret"),
      "OWNER_PROOF_INVALID"
    );
  });

  it("rejects token tampering and expired challenges", () => {
    const challenge = issueOwnerChallenge({
      entitlementId: "ent-1",
      providerId: "repair-a",
      claimant: "alice",
      action: "VERIFY",
      secret: CHALLENGE_SECRET,
      ttlSeconds: 30,
      now: new Date("2026-09-20T00:00:00.000Z")
    });

    const tampered = `${challenge.token.slice(0, -1)}${challenge.token.endsWith("a") ? "b" : "a"}`;
    expectSkillPassCode(
      () => verifyChallengeToken(tampered, CHALLENGE_SECRET, new Date("2026-09-20T00:00:10.000Z")),
      "CHALLENGE_INVALID"
    );
    expectSkillPassCode(
      () => verifyChallengeToken(challenge.token, CHALLENGE_SECRET, new Date("2026-09-20T00:00:31.000Z")),
      "CHALLENGE_EXPIRED"
    );
  });

  it("keeps claim idempotency hash stable across renewed challenges", () => {
    const common = {
      entitlementId: "ent-1",
      providerId: "repair-a",
      claimant: "alice",
      action: "CLAIM" as const,
      serviceEventId: "repair-order-42",
      secret: CHALLENGE_SECRET,
      ttlSeconds: 120
    };
    const first = issueOwnerChallenge({ ...common, now: new Date("2026-09-20T00:00:00.000Z") });
    const second = issueOwnerChallenge({ ...common, now: new Date("2026-09-20T00:01:00.000Z") });

    expect(first.challengeId).not.toBe(second.challengeId);
    expect(ownerProofRequestHash(first)).not.toBe(ownerProofRequestHash(second));
    expect(claimRequestHash(first)).toBe(claimRequestHash(second));
  });

  it("binds Care service type and units into CLAIM proof and idempotency hashes", () => {
    const base = {
      entitlementId: "ent-1",
      providerId: "repair-a",
      claimant: "alice",
      action: "CLAIM" as const,
      serviceEventId: "svc-typed-1",
      secret: CHALLENGE_SECRET,
      ttlSeconds: 120,
      now: new Date("2026-09-20T00:00:00.000Z")
    };
    const diagnostic = issueOwnerChallenge({ ...base, serviceType: "DIAGNOSTIC", unitsConsumed: 1 });
    const repair = issueOwnerChallenge({ ...base, serviceType: "REPAIR", unitsConsumed: 1 });
    const twoUnits = issueOwnerChallenge({ ...base, serviceType: "DIAGNOSTIC", unitsConsumed: 2 });

    expect(diagnostic.message).toContain("serviceType=DIAGNOSTIC");
    expect(diagnostic.message).toContain("unitsConsumed=1");
    expect(claimRequestHash(diagnostic)).not.toBe(claimRequestHash(repair));
    expect(claimRequestHash(diagnostic)).not.toBe(claimRequestHash(twoUnits));
  });

  it("requires serviceEventId only for claim challenges", () => {
    expectSkillPassCode(
      () => issueOwnerChallenge({
        entitlementId: "ent-1",
        providerId: "repair-a",
        claimant: "alice",
        action: "CLAIM",
        secret: CHALLENGE_SECRET,
        ttlSeconds: 120
      }),
      "VALIDATION_ERROR"
    );

    expectSkillPassCode(
      () => issueOwnerChallenge({
        entitlementId: "ent-1",
        providerId: "repair-a",
        claimant: "alice",
        action: "VERIFY",
        serviceEventId: "not-allowed",
        secret: CHALLENGE_SECRET,
        ttlSeconds: 120
      }),
      "VALIDATION_ERROR"
    );
  });
});
