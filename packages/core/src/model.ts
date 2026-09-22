import type { EntitlementId, EntitlementStatus, Principal, ProviderId } from "@skillpass-care/shared";

export const SERVICE_RIGHT_SCHEMA_VERSION = 1 as const;

/** Care-owned mutable application state. It deliberately contains no authoritative owner. */
export interface CareCoverage {
  schemaVersion: typeof SERVICE_RIGHT_SCHEMA_VERSION;
  id: EntitlementId;
  issuerId: string;
  productCommitment: string;
  serviceClass: string;
  remainingClaims: number;
  expiresAt: string;
  transferable: boolean;
  acceptedProviderIds: ProviderId[];
  status: EntitlementStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** Ownership snapshot resolved from canonical SkillPass/CKB state. */
export interface SkillPassOwnershipSnapshot {
  entitlementId: EntitlementId;
  owner: Principal;
  /** Canonical live Cell reference, e.g. ckb:testnet:<txHash>:<index>. */
  stateRef: string;
  transferable: boolean;
  issuerId?: string;
  serviceId?: string;
  policyHash?: string;
}

/** Compatibility API view composed from independent ownership + Care state. */
export interface ServiceRight extends CareCoverage {
  owner: Principal;
  ownershipStateRef: string;
}

export interface CreateCareCoverageInput {
  id?: EntitlementId;
  issuerId: string;
  productCommitment: string;
  serviceClass: string;
  remainingClaims: number;
  expiresAt: string;
  transferable: boolean;
  acceptedProviderIds: ProviderId[];
}

/** Existing API input retained for demo issuance; owner is delegated to SkillPassOwnershipPort. */
export interface CreateServiceRightInput extends CreateCareCoverageInput {
  owner: Principal;
}

export function composeServiceRight(
  coverage: CareCoverage,
  ownership: SkillPassOwnershipSnapshot
): ServiceRight {
  return {
    ...coverage,
    owner: ownership.owner,
    ownershipStateRef: ownership.stateRef,
    transferable: ownership.transferable && coverage.transferable
  };
}
