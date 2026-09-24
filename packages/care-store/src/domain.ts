import {
  consumeCoverage,
  SERVICE_RIGHT_SCHEMA_VERSION,
  setCoverageStatus,
  type CareCoverage,
  type CreateCareCoverageInput
} from "@skillpass-care/core";
import {
  SkillPassError,
  type CareServiceType,
  type ClaimMutationOptions,
  type EntitlementStatus,
  type MutationOptions,
  type ServiceEventRecord
} from "@skillpass-care/shared";
import type { CareConsumptionContext } from "./types.js";

export interface NormalizedConsumption {
  serviceType: CareServiceType;
  unitsConsumed: number;
}

export function validateCreateCareCoverageInput(input: CreateCareCoverageInput, now = new Date()): void {
  if (input.id !== undefined && (!input.id.trim() || input.id.length > 256)) {
    throw new SkillPassError("VALIDATION_ERROR", "entitlement id must be 1..256 characters", 400);
  }
  if (!input.issuerId.trim() || input.issuerId.length > 256) {
    throw new SkillPassError("VALIDATION_ERROR", "issuerId must be 1..256 characters", 400);
  }
  if (!/^sha256:[0-9a-f]{64}$/i.test(input.productCommitment)) {
    throw new SkillPassError("VALIDATION_ERROR", "productCommitment must be sha256:<64 hex>", 400);
  }
  if (!input.serviceClass.trim() || input.serviceClass.length > 128) {
    throw new SkillPassError("VALIDATION_ERROR", "serviceClass must be 1..128 characters", 400);
  }
  if (!Number.isSafeInteger(input.remainingClaims) || input.remainingClaims < 1 || input.remainingClaims > 10_000) {
    throw new SkillPassError("VALIDATION_ERROR", "remainingClaims must be an integer between 1 and 10000", 400);
  }
  const expiresAt = Date.parse(input.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
    throw new SkillPassError("VALIDATION_ERROR", "expiresAt must be a valid future timestamp", 400);
  }
  if (!Array.isArray(input.acceptedProviderIds) || input.acceptedProviderIds.length < 1 || input.acceptedProviderIds.length > 100) {
    throw new SkillPassError("VALIDATION_ERROR", "acceptedProviderIds must contain 1..100 providers", 400);
  }
  const normalized = input.acceptedProviderIds.map((providerId) => providerId.trim());
  if (normalized.some((providerId) => !providerId || providerId.length > 128)) {
    throw new SkillPassError("VALIDATION_ERROR", "provider ids must be 1..128 characters", 400);
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new SkillPassError("VALIDATION_ERROR", "acceptedProviderIds must be unique", 400);
  }
}

export function initializeCareCoverage(
  input: CreateCareCoverageInput,
  id: string,
  now = new Date()
): CareCoverage {
  validateCreateCareCoverageInput(input, now);
  const timestamp = now.toISOString();
  return {
    schemaVersion: SERVICE_RIGHT_SCHEMA_VERSION,
    id,
    issuerId: input.issuerId.trim(),
    productCommitment: input.productCommitment.toLowerCase(),
    serviceClass: input.serviceClass.trim(),
    remainingClaims: input.remainingClaims,
    expiresAt: new Date(input.expiresAt).toISOString(),
    transferable: input.transferable,
    acceptedProviderIds: [...input.acceptedProviderIds].map((providerId) => providerId.trim()).sort(),
    status: "ACTIVE",
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function normalizeConsumption(options: ClaimMutationOptions): NormalizedConsumption {
  return {
    serviceType: options.serviceType ?? "REPAIR",
    unitsConsumed: options.unitsConsumed ?? 1
  };
}

export function serviceEventFingerprint(
  entitlementId: string,
  context: CareConsumptionContext,
  options: ClaimMutationOptions
): string {
  const normalized = normalizeConsumption(options);
  return JSON.stringify([
    entitlementId,
    context.claimant,
    context.providerId,
    options.requestHash,
    normalized.serviceType,
    normalized.unitsConsumed,
    context.authorizationStateRef
  ]);
}

export function serviceEventMatches(
  event: ServiceEventRecord,
  entitlementId: string,
  context: CareConsumptionContext,
  options: ClaimMutationOptions
): boolean {
  const normalized = normalizeConsumption(options);
  return event.entitlementId === entitlementId
    && event.providerId === context.providerId
    && event.claimant === context.claimant
    && event.requestHash === options.requestHash
    && event.authorizationStateRef === context.authorizationStateRef
    && event.serviceType === normalized.serviceType
    && event.unitsConsumed === normalized.unitsConsumed;
}

export function applyCareConsumption(
  coverage: CareCoverage,
  context: CareConsumptionContext,
  options: ClaimMutationOptions,
  now = new Date()
): { coverage: CareCoverage; event: ServiceEventRecord } {
  const normalized = normalizeConsumption(options);
  const next = consumeCoverage(coverage, context.providerId, {
    expectedVersion: options.expectedVersion,
    serviceType: normalized.serviceType,
    unitsConsumed: normalized.unitsConsumed
  }, now);
  const event: ServiceEventRecord = {
    eventVersion: 2,
    eventId: options.serviceEventId,
    entitlementId: coverage.id,
    providerId: context.providerId,
    claimant: context.claimant,
    serviceType: normalized.serviceType,
    unitsConsumed: normalized.unitsConsumed,
    requestHash: options.requestHash,
    authorizationStateRef: context.authorizationStateRef,
    authorizationEvidenceHash: context.authorizationEvidenceHash,
    entitlementVersionBefore: coverage.version,
    entitlementVersionAfter: next.version,
    remainingClaimsAfter: next.remainingClaims,
    occurredAt: next.updatedAt
  };
  return { coverage: next, event };
}

/** Rebuild the exact Care response produced by the original idempotent service event. */
export function coverageAtServiceEvent(current: CareCoverage, event: ServiceEventRecord): CareCoverage {
  return {
    ...current,
    status: "ACTIVE",
    remainingClaims: event.remainingClaimsAfter,
    version: event.entitlementVersionAfter,
    updatedAt: event.occurredAt
  };
}

export function applyCareStatusTransition(
  coverage: CareCoverage,
  issuerId: string,
  status: EntitlementStatus,
  options: MutationOptions,
  now = new Date()
): CareCoverage {
  return setCoverageStatus(coverage, issuerId, status, options, now);
}
