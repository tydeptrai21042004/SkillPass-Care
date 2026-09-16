import type { CreateServiceRightInput, ServiceRight } from "@skillpass/core";
import type { EntitlementId, Principal, ProviderId } from "@skillpass/shared";

/** Storage/ledger boundary used by both the app and independent providers. */
export interface ServiceRightLedger {
  issue(input: CreateServiceRightInput): Promise<ServiceRight>;
  get(entitlementId: EntitlementId): Promise<ServiceRight | undefined>;
  list(): Promise<ServiceRight[]>;
  transfer(entitlementId: EntitlementId, from: Principal, to: Principal): Promise<ServiceRight>;
  claim(entitlementId: EntitlementId, claimant: Principal, providerId: ProviderId): Promise<ServiceRight>;
  resetDemo?(): Promise<ServiceRight>;
}
