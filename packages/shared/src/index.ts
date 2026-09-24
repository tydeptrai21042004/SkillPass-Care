export type Principal = string;
export type ProviderId = string;
export type EntitlementId = string;
export type ServiceEventId = string;

export type EntitlementStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";
export type OwnerProofAction = "VERIFY" | "CLAIM";
export type CareServiceType =
  | "DIAGNOSTIC"
  | "INSPECTION"
  | "REPAIR"
  | "REPLACEMENT"
  | "BATTERY_REPLACEMENT";

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
  /** Care-specific service classification bound into the owner challenge. */
  serviceType?: CareServiceType;
  /** Coverage units consumed by this event. Defaults to one. */
  unitsConsumed?: number;
}

/**
 * Durable/auditable Care-domain record. Ownership still comes from SkillPass/CKB;
 * this record describes service consumption against that ownership state.
 */
export interface ServiceEventRecord {
  eventVersion: 1 | 2;
  eventId: ServiceEventId;
  entitlementId: EntitlementId;
  providerId: ProviderId;
  claimant: Principal;
  serviceType: CareServiceType;
  unitsConsumed: number;
  requestHash: string;
  /** Canonical SkillPass live Cell reference used to authorize this event. */
  authorizationStateRef?: string;
  /** Hash of the canonical provider authorization evidence. */
  authorizationEvidenceHash?: string;
  entitlementVersionBefore: number;
  entitlementVersionAfter: number;
  remainingClaimsAfter: number;
  occurredAt: string;
}

export interface ServiceEventListFilter {
  providerId?: ProviderId;
}

export interface OwnerChallengePayload {
  version: 1;
  challengeId: string;
  entitlementId: EntitlementId;
  providerId: ProviderId;
  claimant: Principal;
  action: OwnerProofAction;
  serviceEventId?: ServiceEventId;
  /** Present only for CLAIM challenges. */
  serviceType?: CareServiceType;
  /** Present only for CLAIM challenges. */
  unitsConsumed?: number;
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
  /** Compatibility summary mode. Split ledgers also expose component modes below. */
  mode: "memory" | "ckb" | "postgres";
  ready: boolean;
  detail?: string;
  rpcReachable?: boolean;
  ownershipMode?: "memory" | "ckb";
  careStoreMode?: "memory" | "postgres";
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
  | "STATE_REF_STALE"
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
