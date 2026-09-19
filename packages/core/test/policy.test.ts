import { describe, expect, it } from "vitest";
import { evaluateAuthorization, type ServiceRight } from "../src/index.js";

const base: ServiceRight = {
  schemaVersion: 1,
  id: "ent-1",
  issuerId: "seller",
  productCommitment: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  owner: "alice",
  serviceClass: "STANDARD_90D",
  remainingClaims: 2,
  expiresAt: "2099-01-01T00:00:00.000Z",
  transferable: true,
  acceptedProviderIds: ["repair-a", "repair-b"],
  status: "ACTIVE",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const request = { entitlementId: base.id, providerId: "repair-a", claimant: "alice" };

describe("evaluateAuthorization", () => {
  it("allows the current owner at an accepted provider", () => {
    expect(evaluateAuthorization(base, request).reason).toBe("ALLOW");
  });

  it.each([
    [undefined, "NOT_FOUND"],
    [{ ...base, status: "SUSPENDED" as const }, "SUSPENDED"],
    [{ ...base, status: "REVOKED" as const }, "REVOKED"],
    [{ ...base, expiresAt: "2020-01-01T00:00:00.000Z" }, "EXPIRED"],
    [{ ...base, owner: "bob" }, "WRONG_OWNER"],
    [{ ...base, acceptedProviderIds: ["repair-b"] }, "PROVIDER_NOT_ACCEPTED"],
    [{ ...base, remainingClaims: 0 }, "NO_CLAIMS_LEFT"]
  ])("rejects invalid state with %s", (right, reason) => {
    expect(evaluateAuthorization(right as ServiceRight | undefined, request).reason).toBe(reason);
  });
});
