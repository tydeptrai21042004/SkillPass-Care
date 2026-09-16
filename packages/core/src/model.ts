import type { EntitlementId, Principal, ProviderId } from "@skillpass/shared";

/**
 * Domain representation of a portable service right.
 *
 * IMPORTANT: `owner` is demo-domain state. In the production CKB adapter,
 * ownership must be derived from the lock script of the canonical live Cell.
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
  active: boolean;
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
