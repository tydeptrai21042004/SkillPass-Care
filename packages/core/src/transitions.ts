import {
  SkillPassError,
  type CareServiceType,
  type EntitlementStatus,
  type MutationOptions,
  type Principal,
  type ProviderId
} from "@skillpass-care/shared";
import type { ServiceRight } from "./model.js";
import { evaluateAuthorization } from "./policy.js";
import { resolveCarePlan } from "./plans.js";

export interface ServiceConsumptionOptions extends MutationOptions {
  serviceType: CareServiceType;
  unitsConsumed: number;
}

export function transferServiceRight(
  right: ServiceRight,
  from: Principal,
  to: Principal,
  options: MutationOptions,
  now = new Date()
): ServiceRight {
  requireVersion(right, options);
  requireActiveAndUnexpired(right, now);
  if (!right.transferable) throw new SkillPassError("FORBIDDEN", "entitlement is not transferable", 403);
  if (right.owner !== from) throw new SkillPassError("FORBIDDEN", "transfer actor is not current owner", 403);
  const nextOwner = requireText(to, "to");
  if (nextOwner === from) throw new SkillPassError("VALIDATION_ERROR", "new owner must be different", 400);
  return commit({ ...right, owner: nextOwner }, now);
}

/**
 * Care-specific service consumption. SkillPass/CKB ownership decides who may
 * act; Care policy decides which service is covered and how many units it uses.
 */
export function consumeServiceRight(
  right: ServiceRight,
  claimant: Principal,
  providerId: ProviderId,
  options: ServiceConsumptionOptions,
  now = new Date()
): ServiceRight {
  requireVersion(right, options);
  const decision = evaluateAuthorization(
    right,
    { entitlementId: right.id, claimant, providerId },
    now
  );
  if (!decision.allowed) {
    throw new SkillPassError("FORBIDDEN", `claim denied: ${decision.reason}`, 403);
  }

  if (!Number.isSafeInteger(options.unitsConsumed) || options.unitsConsumed < 1 || options.unitsConsumed > 100) {
    throw new SkillPassError("VALIDATION_ERROR", "unitsConsumed must be an integer between 1 and 100", 400);
  }
  if (options.unitsConsumed > right.remainingClaims) {
    throw new SkillPassError("FORBIDDEN", "claim denied: insufficient remaining coverage units", 403);
  }

  const plan = resolveCarePlan(right.serviceClass);
  if (plan && !plan.allowedServiceTypes.includes(options.serviceType)) {
    throw new SkillPassError(
      "FORBIDDEN",
      `claim denied: ${options.serviceType} is not covered by ${plan.id}`,
      403
    );
  }

  return commit({ ...right, remainingClaims: right.remainingClaims - options.unitsConsumed }, now);
}

/** Backward-compatible one-unit repair claim used by older v0.4 callers. */
export function claimServiceRight(
  right: ServiceRight,
  claimant: Principal,
  providerId: ProviderId,
  options: MutationOptions,
  now = new Date()
): ServiceRight {
  return consumeServiceRight(
    right,
    claimant,
    providerId,
    { ...options, serviceType: "REPAIR", unitsConsumed: 1 },
    now
  );
}

export function setServiceRightStatus(
  right: ServiceRight,
  issuerId: string,
  status: EntitlementStatus,
  options: MutationOptions,
  now = new Date()
): ServiceRight {
  requireVersion(right, options);
  if (right.issuerId !== issuerId) throw new SkillPassError("FORBIDDEN", "issuer does not control entitlement", 403);
  if (right.status === "REVOKED") {
    throw new SkillPassError("FORBIDDEN", "revoked entitlement cannot change status", 403);
  }
  if (status === right.status) return structuredClone(right);
  return commit({ ...right, status }, now);
}

function requireVersion(right: ServiceRight, options: MutationOptions): void {
  if (!Number.isInteger(options.expectedVersion) || options.expectedVersion < 1) {
    throw new SkillPassError("VALIDATION_ERROR", "expectedVersion must be a positive integer", 400);
  }
  if (right.version !== options.expectedVersion) {
    throw new SkillPassError(
      "VERSION_CONFLICT",
      `stale entitlement version: expected ${options.expectedVersion}, current ${right.version}`,
      409
    );
  }
}

function requireActiveAndUnexpired(right: ServiceRight, now: Date): void {
  if (right.status !== "ACTIVE") {
    throw new SkillPassError("FORBIDDEN", `entitlement is ${right.status.toLowerCase()}`, 403);
  }
  if (Date.parse(right.expiresAt) <= now.getTime()) {
    throw new SkillPassError("FORBIDDEN", "entitlement is expired", 403);
  }
}

function commit(right: ServiceRight, now: Date): ServiceRight {
  return {
    ...right,
    version: right.version + 1,
    updatedAt: now.toISOString()
  };
}

function requireText(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new SkillPassError("VALIDATION_ERROR", `${field} must not be empty`, 400);
  return trimmed;
}
