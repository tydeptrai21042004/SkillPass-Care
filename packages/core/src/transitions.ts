import { SkillPassError, type CareServiceType, type EntitlementStatus, type MutationOptions, type ProviderId } from "@skillpass-care/shared";
import type { CareCoverage } from "./model.js";
import { resolveCarePlan } from "./plans.js";

export interface ServiceConsumptionOptions extends MutationOptions {
  serviceType: CareServiceType;
  unitsConsumed: number;
}

export function consumeCoverage(
  coverage: CareCoverage,
  providerId: ProviderId,
  options: ServiceConsumptionOptions,
  now = new Date()
): CareCoverage {
  requireVersion(coverage, options);
  requireActiveAndUnexpired(coverage, now);
  if (!coverage.acceptedProviderIds.includes(providerId)) throw new SkillPassError("FORBIDDEN", "claim denied: provider not accepted", 403);
  if (!Number.isSafeInteger(options.unitsConsumed) || options.unitsConsumed < 1 || options.unitsConsumed > 100) throw new SkillPassError("VALIDATION_ERROR", "unitsConsumed must be an integer between 1 and 100", 400);
  if (options.unitsConsumed > coverage.remainingClaims) throw new SkillPassError("FORBIDDEN", "claim denied: insufficient remaining coverage units", 403);
  const plan = resolveCarePlan(coverage.serviceClass);
  if (plan && !plan.allowedServiceTypes.includes(options.serviceType)) throw new SkillPassError("FORBIDDEN", `claim denied: ${options.serviceType} is not covered by ${plan.id}`, 403);
  return commit({ ...coverage, remainingClaims: coverage.remainingClaims - options.unitsConsumed }, now);
}

export function setCoverageStatus(
  coverage: CareCoverage,
  issuerId: string,
  status: EntitlementStatus,
  options: MutationOptions,
  now = new Date()
): CareCoverage {
  requireVersion(coverage, options);
  if (coverage.issuerId !== issuerId) throw new SkillPassError("FORBIDDEN", "issuer does not control entitlement", 403);
  if (coverage.status === "REVOKED") throw new SkillPassError("FORBIDDEN", "revoked entitlement cannot change status", 403);
  if (status === coverage.status) return structuredClone(coverage);
  return commit({ ...coverage, status }, now);
}

function requireVersion(coverage: CareCoverage, options: MutationOptions): void {
  if (!Number.isInteger(options.expectedVersion) || options.expectedVersion < 1) throw new SkillPassError("VALIDATION_ERROR", "expectedVersion must be a positive integer", 400);
  if (coverage.version !== options.expectedVersion) throw new SkillPassError("VERSION_CONFLICT", `stale entitlement version: expected ${options.expectedVersion}, current ${coverage.version}`, 409);
}
function requireActiveAndUnexpired(coverage: CareCoverage, now: Date): void {
  if (coverage.status !== "ACTIVE") throw new SkillPassError("FORBIDDEN", `entitlement is ${coverage.status.toLowerCase()}`, 403);
  if (Date.parse(coverage.expiresAt) <= now.getTime()) throw new SkillPassError("FORBIDDEN", "entitlement is expired", 403);
}
function commit(coverage: CareCoverage, now: Date): CareCoverage { return { ...coverage, version: coverage.version + 1, updatedAt: now.toISOString() }; }

/** @deprecated Demo-only compatibility helper. Production ownership transfer belongs to SkillPass. */
export function transferServiceRight(
  right: import("./model.js").ServiceRight,
  from: string,
  to: string,
  options: MutationOptions,
  now = new Date()
): import("./model.js").ServiceRight {
  requireVersion(right, options);
  requireActiveAndUnexpired(right, now);
  if (!right.transferable) throw new SkillPassError("FORBIDDEN", "entitlement is not transferable", 403);
  if (right.owner !== from) throw new SkillPassError("FORBIDDEN", "transfer actor is not current owner", 403);
  if (!to.trim() || to === from) throw new SkillPassError("VALIDATION_ERROR", "new owner must be different", 400);
  return { ...right, owner: to.trim(), ownershipStateRef: `demo:${right.id}:v${right.version + 1}`, version: right.version + 1, updatedAt: now.toISOString() };
}

/** @deprecated Demo-only compatibility helper. Production calls CareCoverageStore.consume after SkillPass authorization. */
export function consumeServiceRight(
  right: import("./model.js").ServiceRight,
  claimant: string,
  providerId: ProviderId,
  options: ServiceConsumptionOptions,
  now = new Date()
): import("./model.js").ServiceRight {
  if (right.owner !== claimant) throw new SkillPassError("FORBIDDEN", "claim denied: WRONG_OWNER", 403);
  return { ...right, ...consumeCoverage(right, providerId, options, now), owner: right.owner, ownershipStateRef: right.ownershipStateRef };
}

/** @deprecated Compatibility alias. */
export function claimServiceRight(
  right: import("./model.js").ServiceRight,
  claimant: string,
  providerId: ProviderId,
  options: MutationOptions,
  now = new Date()
): import("./model.js").ServiceRight {
  return consumeServiceRight(right, claimant, providerId, { ...options, serviceType: "REPAIR", unitsConsumed: 1 }, now);
}

/** @deprecated Compatibility alias. */
export function setServiceRightStatus(
  right: import("./model.js").ServiceRight,
  issuerId: string,
  status: EntitlementStatus,
  options: MutationOptions,
  now = new Date()
): import("./model.js").ServiceRight {
  return { ...right, ...setCoverageStatus(right, issuerId, status, options, now), owner: right.owner, ownershipStateRef: right.ownershipStateRef };
}
