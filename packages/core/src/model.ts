import type { EntitlementId, EntitlementStatus, Principal, ProviderId } from "@skillpass/shared";

/**
 * Domain representation used by the pilot.
 *
 * In a CKB implementation, `owner` MUST be derived from the lock script of the
 * canonical live Cell rather than trusted from serialized Cell data.
 */
export interface ServiceRight {
  id: EntitlementId;
  issuerId: string;
  productHash: string;
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
  productHash: string;
  owner: Principal;
  serviceClass: string;
  remainingClaims: number;
  expiresAt: string;
  transferable: boolean;
  acceptedProviderIds: ProviderId[];
}
