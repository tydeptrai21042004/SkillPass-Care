import { describe, expect, it } from "vitest";
import { decodeCkbServiceRightData, encodeCkbServiceRightData, toCkbServiceRightData } from "../src/index.js";
import type { ServiceRight } from "@skillpass-care/core";

const right: ServiceRight = {
  schemaVersion: 1,
  id: "ent-1",
  issuerId: "seller",
  productCommitment: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  owner: "alice-lock-derived",
  serviceClass: "STANDARD_90D",
  remainingClaims: 2,
  expiresAt: "2099-01-01T00:00:00.000Z",
  transferable: true,
  acceptedProviderIds: ["repair-a", "repair-b"],
  status: "ACTIVE",
  version: 4,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z"
};

describe("CKB ServiceRight V1 schema", () => {
  it("encodes deterministically and intentionally excludes owner from Cell data", () => {
    const data = toCkbServiceRightData(right);
    expect("owner" in data).toBe(false);
    const first = encodeCkbServiceRightData(data);
    const second = encodeCkbServiceRightData(data);
    expect(Buffer.from(first).toString("hex")).toBe(Buffer.from(second).toString("hex"));
    expect(decodeCkbServiceRightData(first)).toEqual(data);
  });

  it("rejects ambiguous or non-canonical Cell payloads", () => {
    const data = toCkbServiceRightData(right);
    const withOwner = new TextEncoder().encode(JSON.stringify({ ...data, owner: "alice" }));
    expect(() => decodeCkbServiceRightData(withOwner)).toThrow("unknown field");

    const unsortedProviders = new TextEncoder().encode(JSON.stringify({
      ...data,
      acceptedProviderIds: ["repair-b", "repair-a"]
    }));
    expect(() => decodeCkbServiceRightData(unsortedProviders)).toThrow("sorted");

    const nonCanonicalCommitment = new TextEncoder().encode(JSON.stringify({
      ...data,
      productCommitment: data.productCommitment.toUpperCase()
    }));
    expect(() => decodeCkbServiceRightData(nonCanonicalCommitment)).toThrow("canonical lowercase");
  });

  it("fails closed on unsupported schema versions", () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ ...toCkbServiceRightData(right), schemaVersion: 2 }));
    expect(() => decodeCkbServiceRightData(bytes)).toThrow("schemaVersion");
  });
});
