import type { AuthorizationDecision, VerificationRequest } from "@skillpass-care/shared";
import type { CareCoverage, ServiceRight, SkillPassOwnershipSnapshot } from "./model.js";

/** Care policy is evaluated only after ownership has been resolved by SkillPass. */
export function evaluateCareAuthorization(
  coverage: CareCoverage | undefined,
  ownership: SkillPassOwnershipSnapshot | undefined,
  request: VerificationRequest,
  now = new Date()
): AuthorizationDecision {
  if (!coverage || !ownership) return { allowed: false, reason: "NOT_FOUND" };
  if (coverage.status === "SUSPENDED") return { allowed: false, reason: "SUSPENDED", entitlementVersion: coverage.version };
  if (coverage.status === "REVOKED") return { allowed: false, reason: "REVOKED", entitlementVersion: coverage.version };
  if (new Date(coverage.expiresAt).getTime() <= now.getTime()) return { allowed: false, reason: "EXPIRED", entitlementVersion: coverage.version };
  if (ownership.owner !== request.claimant) return { allowed: false, reason: "WRONG_OWNER", entitlementVersion: coverage.version };
  if (!coverage.acceptedProviderIds.includes(request.providerId)) return { allowed: false, reason: "PROVIDER_NOT_ACCEPTED", entitlementVersion: coverage.version };
  if (coverage.remainingClaims <= 0) return { allowed: false, reason: "NO_CLAIMS_LEFT", entitlementVersion: coverage.version };
  return { allowed: true, reason: "ALLOW", entitlementVersion: coverage.version };
}

/** Compatibility wrapper for callers that already hold a composed view. */
export function evaluateAuthorization(
  right: ServiceRight | undefined,
  request: VerificationRequest,
  now = new Date()
): AuthorizationDecision {
  if (!right) return { allowed: false, reason: "NOT_FOUND" };
  const { owner, ownershipStateRef, ...coverage } = right;
  return evaluateCareAuthorization(
    coverage,
    { entitlementId: right.id, owner, stateRef: ownershipStateRef, transferable: right.transferable },
    request,
    now
  );
}
