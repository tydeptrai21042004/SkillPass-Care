export type Principal = string;
export type ProviderId = string;
export type EntitlementId = string;

export interface VerificationRequest {
  entitlementId: EntitlementId;
  providerId: ProviderId;
  claimant: Principal;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason:
    | "ALLOW"
    | "NOT_FOUND"
    | "EXPIRED"
    | "WRONG_OWNER"
    | "PROVIDER_NOT_ACCEPTED"
    | "NO_CLAIMS_LEFT"
    | "INACTIVE";
  entitlementVersion?: number;
}
