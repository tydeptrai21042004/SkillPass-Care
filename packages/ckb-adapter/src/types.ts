import type { CreateServiceRightInput, ServiceRight, SkillPassOwnershipSnapshot } from "@skillpass-care/core";
import type { CareCoverageStore } from "@skillpass-care/care-store";
import type { AuthorizationEvidence, ClaimMutationOptions, EntitlementId, EntitlementStatus, LedgerHealth, LedgerListFilter, MutationOptions, Principal, ProviderId, ServiceEventListFilter, ServiceEventRecord } from "@skillpass-care/shared";

export interface SkillPassAuthorizationRequest { entitlementId: EntitlementId; claimant: Principal; providerId: ProviderId; challengeId?: string; requestHash: string; }
export interface SkillPassOwnershipPort {
  issueDemo?(entitlementId: EntitlementId, owner: Principal, transferable: boolean): Promise<SkillPassOwnershipSnapshot>;
  resolve(entitlementId: EntitlementId): Promise<SkillPassOwnershipSnapshot | undefined>;
  authorize(request: SkillPassAuthorizationRequest): Promise<AuthorizationEvidence>;
  assertStateRefCurrent(stateRef: string): Promise<void>;
  transfer?(entitlementId: EntitlementId, from: Principal, to: Principal): Promise<SkillPassOwnershipSnapshot>;
  health(): Promise<LedgerHealth>;
  reset?(): Promise<void>;
}

/** Compatibility facade. Internally ownership and Care state are separate ports. */
export interface ServiceRightLedger {
  readonly ownership?: SkillPassOwnershipPort;
  readonly care?: CareCoverageStore;
  issue(input: CreateServiceRightInput): Promise<ServiceRight>;
  get(entitlementId: EntitlementId): Promise<ServiceRight | undefined>;
  list(filter?: LedgerListFilter): Promise<ServiceRight[]>;
  transfer(entitlementId: EntitlementId, from: Principal, to: Principal, options: MutationOptions): Promise<ServiceRight>;
  claim(entitlementId: EntitlementId, claimant: Principal, providerId: ProviderId, options: ClaimMutationOptions & { authorizationEvidence?: AuthorizationEvidence }): Promise<ServiceRight>;
  listServiceEvents(entitlementId: EntitlementId, filter?: ServiceEventListFilter): Promise<ServiceEventRecord[]>;
  setStatus(entitlementId: EntitlementId, issuerId: string, status: EntitlementStatus, options: MutationOptions): Promise<ServiceRight>;
  health(): Promise<LedgerHealth>;
  resetDemo?(): Promise<ServiceRight>;
}
