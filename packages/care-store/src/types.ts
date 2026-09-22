import type { CareCoverage, CreateCareCoverageInput } from "@skillpass-care/core";
import type { ClaimMutationOptions, EntitlementId, EntitlementStatus, LedgerHealth, LedgerListFilter, MutationOptions, ProviderId, ServiceEventListFilter, ServiceEventRecord } from "@skillpass-care/shared";

export interface CareConsumptionContext {
  claimant: string;
  providerId: ProviderId;
  authorizationStateRef: string;
  authorizationEvidenceHash: string;
  assertStateRefCurrent: (stateRef: string) => Promise<void>;
}

export interface CareCoverageStore {
  create(input: CreateCareCoverageInput): Promise<CareCoverage>;
  get(id: EntitlementId): Promise<CareCoverage | undefined>;
  list(filter?: Omit<LedgerListFilter, "owner">): Promise<CareCoverage[]>;
  consume(id: EntitlementId, context: CareConsumptionContext, options: ClaimMutationOptions): Promise<{ coverage: CareCoverage; event: ServiceEventRecord }>;
  listServiceEvents(id: EntitlementId, filter?: ServiceEventListFilter): Promise<ServiceEventRecord[]>;
  setStatus(id: EntitlementId, issuerId: string, status: EntitlementStatus, options: MutationOptions): Promise<CareCoverage>;
  health(): Promise<LedgerHealth>;
  reset?(): Promise<void>;
}
