import { randomUUID } from "node:crypto";
import {
  consumeServiceRight,
  SERVICE_RIGHT_SCHEMA_VERSION,
  setServiceRightStatus,
  transferServiceRight,
  type CreateServiceRightInput,
  type ServiceRight
} from "@skillpass-care/core";
import {
  SkillPassError,
  type CareServiceType,
  type ClaimMutationOptions,
  type EntitlementId,
  type EntitlementStatus,
  type LedgerHealth,
  type LedgerListFilter,
  type MutationOptions,
  type Principal,
  type ProviderId,
  type ServiceEventListFilter,
  type ServiceEventRecord
} from "@skillpass-care/shared";
import type { ServiceRightLedger } from "./types.js";

interface ClaimEventRecord {
  entitlementId: EntitlementId;
  claimant: Principal;
  providerId: ProviderId;
  requestHash: string;
  serviceType: CareServiceType;
  unitsConsumed: number;
  result: ServiceRight;
  event: ServiceEventRecord;
}

/** Executable ledger for local demos/tests. Not a substitute for CKB finality or a durable SQL store. */
export class InMemoryLedger implements ServiceRightLedger {
  private readonly rights = new Map<EntitlementId, ServiceRight>();
  private readonly claimEvents = new Map<string, ClaimEventRecord>();
  private readonly serviceEventsByEntitlement = new Map<EntitlementId, ServiceEventRecord[]>();

  async issue(input: CreateServiceRightInput): Promise<ServiceRight> {
    const issuerId = requireText(input.issuerId, "issuerId", 256);
    const owner = requireText(input.owner, "owner", 256);
    const productCommitment = requireProductCommitment(input.productCommitment);
    const serviceClass = requireText(input.serviceClass, "serviceClass", 128);
    if (input.remainingClaims < 1 || input.remainingClaims > 10_000 || !Number.isSafeInteger(input.remainingClaims)) {
      throw new SkillPassError("VALIDATION_ERROR", "remainingClaims must be an integer between 1 and 10000", 400);
    }
    if (typeof input.transferable !== "boolean") {
      throw new SkillPassError("VALIDATION_ERROR", "transferable must be a boolean", 400);
    }
    const expiry = Date.parse(input.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= Date.now()) {
      throw new SkillPassError("VALIDATION_ERROR", "expiresAt must be a valid future timestamp", 400);
    }
    if (!Array.isArray(input.acceptedProviderIds) || input.acceptedProviderIds.length > 100) {
      throw new SkillPassError("VALIDATION_ERROR", "acceptedProviderIds must contain between 1 and 100 providers", 400);
    }
    const providers = [...new Set(input.acceptedProviderIds.map((x) => requireText(x, "providerId", 128)))].sort();
    if (providers.length === 0) {
      throw new SkillPassError("VALIDATION_ERROR", "at least one provider is required", 400);
    }

    const now = new Date().toISOString();
    const right: ServiceRight = {
      schemaVersion: SERVICE_RIGHT_SCHEMA_VERSION,
      id: `ent-${randomUUID()}`,
      issuerId,
      productCommitment,
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
    this.serviceEventsByEntitlement.set(right.id, []);
    return clone(right);
  }

  async get(id: EntitlementId): Promise<ServiceRight | undefined> {
    const right = this.rights.get(id);
    return right ? clone(right) : undefined;
  }

  async list(filter: LedgerListFilter = {}): Promise<ServiceRight[]> {
    return [...this.rights.values()]
      .filter((right) => {
        if (filter.issuerId !== undefined && right.issuerId !== filter.issuerId) return false;
        if (filter.owner !== undefined && right.owner !== filter.owner) return false;
        if (filter.providerId !== undefined && !right.acceptedProviderIds.includes(filter.providerId)) return false;
        return true;
      })
      .map(clone);
  }

  async transfer(
    id: EntitlementId,
    from: Principal,
    to: Principal,
    options: MutationOptions
  ): Promise<ServiceRight> {
    const right = this.require(id);
    const next = transferServiceRight(right, from, to, options);
    this.rights.set(next.id, next);
    return clone(next);
  }

  async claim(
    id: EntitlementId,
    claimant: Principal,
    providerId: ProviderId,
    options: ClaimMutationOptions
  ): Promise<ServiceRight> {
    const normalizedProviderId = requireText(providerId, "providerId", 128);
    const normalizedClaimant = requireText(claimant, "claimant", 256);
    const serviceEventId = requireText(options.serviceEventId, "serviceEventId", 256);
    const eventKey = `${normalizedProviderId}:${serviceEventId}`;
    const requestHash = requireRequestHash(options.requestHash);
    const serviceType = options.serviceType ?? "REPAIR";
    const unitsConsumed = options.unitsConsumed ?? 1;
    const existing = this.claimEvents.get(eventKey);
    if (existing) {
      const sameRequest = existing.entitlementId === id
        && existing.claimant === normalizedClaimant
        && existing.providerId === normalizedProviderId
        && existing.requestHash === requestHash
        && existing.serviceType === serviceType
        && existing.unitsConsumed === unitsConsumed;
      if (!sameRequest) {
        throw new SkillPassError(
          "IDEMPOTENCY_CONFLICT",
          "serviceEventId was already used for a different service request",
          409
        );
      }
      return clone(existing.result);
    }

    const right = this.require(id);
    const next = consumeServiceRight(
      right,
      normalizedClaimant,
      normalizedProviderId,
      { expectedVersion: options.expectedVersion, serviceType, unitsConsumed }
    );
    const event: ServiceEventRecord = {
      eventVersion: 1,
      eventId: serviceEventId,
      entitlementId: id,
      providerId: normalizedProviderId,
      claimant: normalizedClaimant,
      serviceType,
      unitsConsumed,
      requestHash,
      entitlementVersionBefore: right.version,
      entitlementVersionAfter: next.version,
      remainingClaimsAfter: next.remainingClaims,
      occurredAt: next.updatedAt
    };

    this.rights.set(next.id, next);
    this.claimEvents.set(eventKey, {
      entitlementId: id,
      claimant: normalizedClaimant,
      providerId: normalizedProviderId,
      requestHash,
      serviceType,
      unitsConsumed,
      result: clone(next),
      event: clone(event)
    });
    const history = this.serviceEventsByEntitlement.get(id) ?? [];
    history.push(clone(event));
    this.serviceEventsByEntitlement.set(id, history);
    return clone(next);
  }

  async listServiceEvents(
    id: EntitlementId,
    filter: ServiceEventListFilter = {}
  ): Promise<ServiceEventRecord[]> {
    this.require(id);
    return (this.serviceEventsByEntitlement.get(id) ?? [])
      .filter((event) => filter.providerId === undefined || event.providerId === filter.providerId)
      .map(clone);
  }

  async setStatus(
    id: EntitlementId,
    issuerId: string,
    status: EntitlementStatus,
    options: MutationOptions
  ): Promise<ServiceRight> {
    const right = this.require(id);
    const next = setServiceRightStatus(right, issuerId, status, options);
    this.rights.set(next.id, next);
    return clone(next);
  }

  async health(): Promise<LedgerHealth> {
    return { mode: "memory", ready: true, detail: "in-memory Care coverage ledger (demo/single-process only)" };
  }

  async resetDemo(): Promise<ServiceRight> {
    this.rights.clear();
    this.claimEvents.clear();
    this.serviceEventsByEntitlement.clear();
    return this.issue({
      issuerId: "seller-demo",
      productCommitment: "sha256:42f4dc06f496e6209f50c0849c4fb14d0b2a4f752d636a28bb7e091ea462863c",
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
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function requireText(value: string, field: string, max = 256): string {
  if (typeof value !== "string") throw new SkillPassError("VALIDATION_ERROR", `${field} must be a string`, 400);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) {
    throw new SkillPassError("VALIDATION_ERROR", `${field} must contain between 1 and ${max} characters`, 400);
  }
  return trimmed;
}

function requireProductCommitment(value: string): string {
  const normalized = requireText(value, "productCommitment").toLowerCase();
  if (!/^sha256:[0-9a-f]{64}$/.test(normalized)) {
    throw new SkillPassError("VALIDATION_ERROR", "productCommitment must be sha256:<64 hex>", 400);
  }
  return normalized;
}

function requireRequestHash(value: string): string {
  const normalized = requireText(value, "requestHash").toLowerCase();
  if (!/^sha256:[0-9a-f]{64}$/.test(normalized)) {
    throw new SkillPassError("VALIDATION_ERROR", "requestHash must be sha256:<64 hex>", 400);
  }
  return normalized;
}
