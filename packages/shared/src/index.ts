export type Principal = string;
export type ProviderId = string;
export type EntitlementId = string;
export type ServiceEventId = string;

export type EntitlementStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";
export type OwnerProofAction = "VERIFY" | "CLAIM";

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

export interface EvidenceSignature {
  /** Pilot-only shared-secret signature. Replace with an asymmetric provider key for production. */
  scheme: "HMAC-SHA256-PILOT";
  keyId: string;
  value: string;
}

export interface AuthorizationEvidence extends AuthorizationDecision {
  evidenceVersion: 1;
  entitlementId: EntitlementId;
  providerId: ProviderId;
  claimant: Principal;
  challengeId?: string;
  requestHash: string;
  verifiedAt: string;
  expiresAt: string;
  stateRef?: string;
  signature?: EvidenceSignature;
}

export interface MutationOptions {
  expectedVersion: number;
}

export interface ClaimMutationOptions extends MutationOptions {
  /** Stable provider-side service event identifier used for replay-safe retries. */
  serviceEventId: ServiceEventId;
  /** Hash of the canonical claim request/challenge binding. */
  requestHash: string;
}

export interface OwnerChallengePayload {
  version: 1;
  challengeId: string;
  entitlementId: EntitlementId;
  providerId: ProviderId;
  claimant: Principal;
  action: OwnerProofAction;
  serviceEventId?: ServiceEventId;
  issuedAt: string;
  expiresAt: string;
}

export interface OwnerChallenge extends OwnerChallengePayload {
  message: string;
  token: string;
}

export interface OwnerProof {
  scheme: "HMAC-SHA256-PILOT";
  challengeId: string;
  claimant: Principal;
  value: string;
}

export interface LedgerListFilter {
  issuerId?: string;
  owner?: Principal;
  providerId?: ProviderId;
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
  | "IDEMPOTENCY_CONFLICT"
  | "OWNER_PROOF_REQUIRED"
  | "OWNER_PROOF_INVALID"
  | "CHALLENGE_EXPIRED"
  | "CHALLENGE_INVALID"
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
