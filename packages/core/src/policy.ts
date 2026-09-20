import type { AuthorizationDecision, VerificationRequest } from "@skillpass-care/shared";
import type { ServiceRight } from "./model.js";

/** Pure authorization policy with no storage/network side effects. */
export function evaluateAuthorization(
  right: ServiceRight | undefined,
  request: VerificationRequest,
  now = new Date()
): AuthorizationDecision {
  if (!right) return { allowed: false, reason: "NOT_FOUND" };
  if (right.status === "SUSPENDED") {
    return { allowed: false, reason: "SUSPENDED", entitlementVersion: right.version };
  }
  if (right.status === "REVOKED") {
    return { allowed: false, reason: "REVOKED", entitlementVersion: right.version };
  }
  if (new Date(right.expiresAt).getTime() <= now.getTime()) {
    return { allowed: false, reason: "EXPIRED", entitlementVersion: right.version };
  }
  if (right.owner !== request.claimant) {
    return { allowed: false, reason: "WRONG_OWNER", entitlementVersion: right.version };
  }
  if (!right.acceptedProviderIds.includes(request.providerId)) {
    return { allowed: false, reason: "PROVIDER_NOT_ACCEPTED", entitlementVersion: right.version };
  }
  if (right.remainingClaims <= 0) {
    return { allowed: false, reason: "NO_CLAIMS_LEFT", entitlementVersion: right.version };
  }
  return { allowed: true, reason: "ALLOW", entitlementVersion: right.version };
}
