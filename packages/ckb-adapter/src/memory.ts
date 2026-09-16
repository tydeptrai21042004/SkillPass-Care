import { randomUUID } from "node:crypto";
import { evaluateAuthorization, type CreateServiceRightInput, type ServiceRight } from "@skillpass/core";
import type { EntitlementId, Principal, ProviderId } from "@skillpass/shared";
import type { ServiceRightLedger } from "./types.js";

/**
 * Executable ledger for local demos and deterministic tests.
 * This is NOT a substitute for the production CKB adapter.
 */
export class InMemoryLedger implements ServiceRightLedger {
  private rights = new Map<EntitlementId, ServiceRight>();

  async issue(input: CreateServiceRightInput): Promise<ServiceRight> {
    if (input.remainingClaims < 1) throw new Error("remainingClaims must be >= 1");
    if (new Date(input.expiresAt).getTime() <= Date.now()) throw new Error("expiresAt must be in the future");
    const now = new Date().toISOString();
    const right: ServiceRight = {
      ...input,
      id: `ent-${randomUUID()}`,
      active: true,
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    this.rights.set(right.id, right);
    return structuredClone(right);
  }

  async get(id: EntitlementId): Promise<ServiceRight | undefined> {
    const right = this.rights.get(id);
    return right ? structuredClone(right) : undefined;
  }

  async list(): Promise<ServiceRight[]> {
    return [...this.rights.values()].map((x) => structuredClone(x));
  }

  async transfer(id: EntitlementId, from: Principal, to: Principal): Promise<ServiceRight> {
    const right = this.require(id);
    if (!right.transferable) throw new Error("entitlement is not transferable");
    if (right.owner !== from) throw new Error("transfer source is not current owner");
    if (!to || to === from) throw new Error("new owner must be different");
    const next = { ...right, owner: to, version: right.version + 1, updatedAt: new Date().toISOString() };
    this.rights.set(id, next);
    return structuredClone(next);
  }

  async claim(id: EntitlementId, claimant: Principal, providerId: ProviderId): Promise<ServiceRight> {
    const right = this.require(id);
    const decision = evaluateAuthorization(right, { entitlementId: id, claimant, providerId });
    if (!decision.allowed) throw new Error(`claim denied: ${decision.reason}`);
    const next = {
      ...right,
      remainingClaims: right.remainingClaims - 1,
      version: right.version + 1,
      updatedAt: new Date().toISOString()
    };
    this.rights.set(id, next);
    return structuredClone(next);
  }

  async resetDemo(): Promise<ServiceRight> {
    this.rights.clear();
    return this.issue({
      issuerId: "seller-demo",
      productHash: "sha256:device-demo-001",
      owner: "alice",
      serviceClass: "STANDARD_90D",
      remainingClaims: 3,
      expiresAt: "2099-12-31T23:59:59.000Z",
      transferable: true,
      acceptedProviderIds: ["repair-a", "repair-b"]
    });
  }

  private require(id: EntitlementId): ServiceRight {
    const right = this.rights.get(id);
    if (!right) throw new Error("entitlement not found");
    return right;
  }
}
