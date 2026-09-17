export type Principal = string;
export type ProviderId = string;
export type EntitlementId = string;

export type EntitlementStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";

export type AuthorizationReason =
  | "ALLOW"
  | "NOT_FOUND"
  | "EXPIRED"
  | "WRONG_OWNER"
  | "PROVIDER_NOT_ACCEPTED"
  | "NO_CLAIMS_LEFT"
  | "SUSPENDED"
  | "REVOKED";

export interface VerificationRequest {
  entitlementId: EntitlementId;
  providerId: ProviderId;
  claimant: Principal;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason: AuthorizationReason;
  entitlementVersion?: number;
}

export interface AuthorizationEvidence extends AuthorizationDecision {
  entitlementId: EntitlementId;
  providerId: ProviderId;
  claimant: Principal;
  verifiedAt: string;
}

export interface MutationOptions {
  expectedVersion?: number;
}

export interface LedgerHealth {
  mode: "memory" | "ckb";
  ready: boolean;
  detail?: string;
  rpcReachable?: boolean;
}

export type SkillPassErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "AUTHENTICATION_REQUIRED"
  | "FORBIDDEN"
  | "VERSION_CONFLICT"
  | "LEDGER_UNAVAILABLE"
  | "NOT_IMPLEMENTED";

export class SkillPassError extends Error {
  constructor(
    public readonly code: SkillPassErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "SkillPassError";
  }
}
