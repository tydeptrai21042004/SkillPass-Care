import { describe, expect, it } from "vitest";
import { evaluateAuthorization, type ServiceRight } from "../src/index.js";

const right: ServiceRight = {
  id: "ent-1",
  issuerId: "seller",
  productHash: "sha256:demo",
  owner: "alice",
  serviceClass: "STANDARD_90D",
  remainingClaims: 2,
  expiresAt: "2099-01-01T00:00:00.000Z",
  transferable: true,
  acceptedProviderIds: ["repair-a", "repair-b"],
  active: true,
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

describe("evaluateAuthorization", () => {
  it("allows the current owner at an accepted provider", () => {
    expect(evaluateAuthorization(right, {
      entitlementId: right.id,
      providerId: "repair-a",
      claimant: "alice"
    }).allowed).toBe(true);
  });

  it("rejects a stale owner", () => {
    expect(evaluateAuthorization({ ...right, owner: "bob", version: 2 }, {
      entitlementId: right.id,
      providerId: "repair-a",
      claimant: "alice"
    }).reason).toBe("WRONG_OWNER");
  });
});
