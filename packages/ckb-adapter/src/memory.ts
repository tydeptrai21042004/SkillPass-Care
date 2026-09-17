import { randomUUID } from "node:crypto";
import { evaluateAuthorization, type CreateServiceRightInput, type ServiceRight } from "@skillpass/core";
import {
  SkillPassError,
  type EntitlementId,
  type EntitlementStatus,
  type LedgerHealth,
  type MutationOptions,
  type Principal,
  type ProviderId
} from "@skillpass/shared";
import type { ServiceRightLedger } from "./types.js";

/** Executable ledger for local demos/tests. Not a substitute for CKB finality. */
export class InMemoryLedger implements ServiceRightLedger {
  private readonly rights = new Map<EntitlementId, ServiceRight>();

  async issue(input: CreateServiceRightInput): Promise<ServiceRight> {
    const issuerId = requireText(input.issuerId, "issuerId");
    const owner = requireText(input.owner, "owner");
    const productHash = requireText(input.productHash, "productHash");
    const serviceClass = requireText(input.serviceClass, "serviceClass");
    if (input.remainingClaims < 1 || !Number.isInteger(input.remainingClaims)) {
      throw new SkillPassError("VALIDATION_ERROR", "remainingClaims must be a positive integer", 400);
    }
    const expiry = Date.parse(input.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= Date.now()) {
      throw new SkillPassError("VALIDATION_ERROR", "expiresAt must be a valid future timestamp", 400);
    }
    const providers = [...new Set(input.acceptedProviderIds.map((x) => requireText(x, "providerId")))];
    if (providers.length === 0) {
      throw new SkillPassError("VALIDATION_ERROR", "at least one provider is required", 400);
    }

    const now = new Date().toISOString();
    const right: ServiceRight = {
      id: `ent-${randomUUID()}`,
      issuerId,
      productHash,
      owner,
      serviceClass,
      remainingClaims: input.remainingClaims,
      expiresAt: new Date(expiry).toISOString(),
      transferable: input.transferable,
      acceptedProviderIds: providers,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    this.rights.set(right.id, right);
    return clone(right);
  }

  async get(id: EntitlementId): Promise<ServiceRight | undefined> {
    const right = this.rights.get(id);
    return right ? clone(right) : undefined;
  }

  async list(): Promise<ServiceRight[]> {
    return [...this.rights.values()].map(clone);
  }

  async transfer(
    id: EntitlementId,
    from: Principal,
    to: Principal,
    options: MutationOptions = {}
  ): Promise<ServiceRight> {
    const right = this.requireMutable(id, options);
    this.requireActiveAndUnexpired(right);
    if (!right.transferable) throw new SkillPassError("FORBIDDEN", "entitlement is not transferable", 403);
    if (right.owner !== from) throw new SkillPassError("FORBIDDEN", "transfer actor is not current owner", 403);
    const nextOwner = requireText(to, "to");
    if (nextOwner === from) throw new SkillPassError("VALIDATION_ERROR", "new owner must be different", 400);
    return this.commit({ ...right, owner: nextOwner });
  }

  async claim(
    id: EntitlementId,
    claimant: Principal,
    providerId: ProviderId,
    options: MutationOptions = {}
  ): Promise<ServiceRight> {
    const right = this.requireMutable(id, options);
    const decision = evaluateAuthorization(right, { entitlementId: id, claimant, providerId });
    if (!decision.allowed) {
      throw new SkillPassError("FORBIDDEN", `claim denied: ${decision.reason}`, 403);
    }
    return this.commit({ ...right, remainingClaims: right.remainingClaims - 1 });
  }

  async setStatus(
    id: EntitlementId,
    issuerId: string,
    status: EntitlementStatus,
    options: MutationOptions = {}
  ): Promise<ServiceRight> {
    const right = this.requireMutable(id, options);
    if (right.issuerId !== issuerId) throw new SkillPassError("FORBIDDEN", "issuer does not control entitlement", 403);
    if (right.status === "REVOKED") {
      throw new SkillPassError("FORBIDDEN", "revoked entitlement cannot change status", 403);
    }
    if (status === right.status) return clone(right);
    return this.commit({ ...right, status });
  }

  async health(): Promise<LedgerHealth> {
    return { mode: "memory", ready: true, detail: "in-memory pilot ledger" };
  }

  async resetDemo(): Promise<ServiceRight> {
    this.rights.clear();
    return this.issue({
      issuerId: "seller-demo",
      productHash: "sha256:42f4dc06f496e6209f50c0849c4fb14d0b2a4f752d636a28bb7e091ea462863c",
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
    if (!right) throw new SkillPassError("NOT_FOUND", "entitlement not found", 404);
    return right;
  }

  private requireMutable(id: EntitlementId, options: MutationOptions): ServiceRight {
    const right = this.require(id);
    if (options.expectedVersion !== undefined && right.version !== options.expectedVersion) {
      throw new SkillPassError(
        "VERSION_CONFLICT",
        `stale entitlement version: expected ${options.expectedVersion}, current ${right.version}`,
        409
      );
    }
    return right;
  }

  private requireActiveAndUnexpired(right: ServiceRight): void {
    if (right.status !== "ACTIVE") throw new SkillPassError("FORBIDDEN", `entitlement is ${right.status.toLowerCase()}`, 403);
    if (Date.parse(right.expiresAt) <= Date.now()) throw new SkillPassError("FORBIDDEN", "entitlement is expired", 403);
  }

  private commit(right: ServiceRight): ServiceRight {
    const next: ServiceRight = {
      ...right,
      version: right.version + 1,
      updatedAt: new Date().toISOString()
    };
    this.rights.set(next.id, next);
    return clone(next);
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function requireText(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new SkillPassError("VALIDATION_ERROR", `${field} must not be empty`, 400);
  return trimmed;
}
