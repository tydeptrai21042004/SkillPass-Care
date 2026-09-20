import type { CreateServiceRightInput, ServiceRight } from "@skillpass-care/core";
import type {
  ClaimMutationOptions,
  EntitlementId,
  EntitlementStatus,
  LedgerHealth,
  LedgerListFilter,
  MutationOptions,
  Principal,
  ProviderId,
  ServiceEventListFilter,
  ServiceEventRecord
} from "@skillpass-care/shared";

/** Storage/ledger boundary used by the API and independent provider verifiers. */
export interface ServiceRightLedger {
  issue(input: CreateServiceRightInput): Promise<ServiceRight>;
  get(entitlementId: EntitlementId): Promise<ServiceRight | undefined>;
  list(filter?: LedgerListFilter): Promise<ServiceRight[]>;
  transfer(
    entitlementId: EntitlementId,
    from: Principal,
    to: Principal,
    options: MutationOptions
  ): Promise<ServiceRight>;
  claim(
    entitlementId: EntitlementId,
    claimant: Principal,
    providerId: ProviderId,
    options: ClaimMutationOptions
  ): Promise<ServiceRight>;
  listServiceEvents(
    entitlementId: EntitlementId,
    filter?: ServiceEventListFilter
  ): Promise<ServiceEventRecord[]>;
  setStatus(
    entitlementId: EntitlementId,
    issuerId: string,
    status: EntitlementStatus,
    options: MutationOptions
  ): Promise<ServiceRight>;
  health(): Promise<LedgerHealth>;
  resetDemo?(): Promise<ServiceRight>;
}
