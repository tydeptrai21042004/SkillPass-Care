import type { CreateServiceRightInput, ServiceRight } from "@skillpass/core";
import type {
  EntitlementId,
  EntitlementStatus,
  LedgerHealth,
  MutationOptions,
  Principal,
  ProviderId
} from "@skillpass/shared";

/** Storage/ledger boundary used by the API and independent provider verifiers. */
export interface ServiceRightLedger {
  issue(input: CreateServiceRightInput): Promise<ServiceRight>;
  get(entitlementId: EntitlementId): Promise<ServiceRight | undefined>;
  list(): Promise<ServiceRight[]>;
  transfer(
    entitlementId: EntitlementId,
    from: Principal,
    to: Principal,
    options?: MutationOptions
  ): Promise<ServiceRight>;
  claim(
    entitlementId: EntitlementId,
    claimant: Principal,
    providerId: ProviderId,
    options?: MutationOptions
  ): Promise<ServiceRight>;
  setStatus(
    entitlementId: EntitlementId,
    issuerId: string,
    status: EntitlementStatus,
    options?: MutationOptions
  ): Promise<ServiceRight>;
  health(): Promise<LedgerHealth>;
  resetDemo?(): Promise<ServiceRight>;
}
