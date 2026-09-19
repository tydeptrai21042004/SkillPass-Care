import type { EntitlementId, EntitlementStatus, Principal, ProviderId } from "@skillpass/shared";

export const SERVICE_RIGHT_SCHEMA_VERSION = 1 as const;

/**
 * Domain representation used by the pilot.
 *
 * In a CKB implementation, `owner` MUST be derived from the lock script of the
 * canonical live Cell rather than trusted from serialized Cell data.
 * `version` is the state revision; `schemaVersion` is the protocol/data layout.
 */
export interface ServiceRight {
  schemaVersion: typeof SERVICE_RIGHT_SCHEMA_VERSION;
  id: EntitlementId;
  issuerId: string;
  /** Privacy-preserving commitment to the physical product identifier. */
  productCommitment: string;
  owner: Principal;
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

export interface CreateServiceRightInput {
  issuerId: string;
  productCommitment: string;
  owner: Principal;
  serviceClass: string;
  remainingClaims: number;
  expiresAt: string;
  transferable: boolean;
  acceptedProviderIds: ProviderId[];
}
