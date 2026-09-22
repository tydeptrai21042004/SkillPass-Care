import { randomUUID } from "node:crypto";
import { consumeCoverage, SERVICE_RIGHT_SCHEMA_VERSION, setCoverageStatus, type CareCoverage, type CreateCareCoverageInput } from "@skillpass-care/core";
import { SkillPassError, type ClaimMutationOptions, type EntitlementId, type EntitlementStatus, type LedgerHealth, type LedgerListFilter, type MutationOptions, type ServiceEventListFilter, type ServiceEventRecord } from "@skillpass-care/shared";
import type { CareConsumptionContext, CareCoverageStore } from "./types.js";

export class InMemoryCareStore implements CareCoverageStore {
  private coverage = new Map<string, CareCoverage>();
  private events = new Map<string, ServiceEventRecord[]>();
  private idempotency = new Map<string, { fingerprint: string; coverage: CareCoverage; event: ServiceEventRecord }>();

  async create(input: CreateCareCoverageInput): Promise<CareCoverage> {
    const now = new Date().toISOString();
    const id = input.id ?? `ent-${randomUUID()}`;
    const row: CareCoverage = { schemaVersion: SERVICE_RIGHT_SCHEMA_VERSION, id, issuerId: input.issuerId, productCommitment: input.productCommitment, serviceClass: input.serviceClass, remainingClaims: input.remainingClaims, expiresAt: input.expiresAt, transferable: input.transferable, acceptedProviderIds: [...new Set(input.acceptedProviderIds)].sort(), status: "ACTIVE", version: 1, createdAt: now, updatedAt: now };
    this.coverage.set(id, row); this.events.set(id, []); return clone(row);
  }
  async get(id: EntitlementId) { const row = this.coverage.get(id); return row ? clone(row) : undefined; }
  async list(filter: Omit<LedgerListFilter,"owner"> = {}) { return [...this.coverage.values()].filter(x => (!filter.issuerId || x.issuerId===filter.issuerId) && (!filter.providerId || x.acceptedProviderIds.includes(filter.providerId))).map(clone); }
  async consume(id: EntitlementId, context: CareConsumptionContext, options: ClaimMutationOptions) {
    const key = `${context.providerId}:${options.serviceEventId}`;
    const fingerprint = JSON.stringify([id, context.claimant, options.requestHash, options.serviceType ?? "REPAIR", options.unitsConsumed ?? 1, context.authorizationStateRef]);
    const prior = this.idempotency.get(key);
    if (prior) { if (prior.fingerprint !== fingerprint) throw new SkillPassError("IDEMPOTENCY_CONFLICT", "serviceEventId was already used for a different service request", 409); return { coverage: clone(prior.coverage), event: clone(prior.event) }; }
    const current = this.require(id);
    await context.assertStateRefCurrent(context.authorizationStateRef);
    const next = consumeCoverage(current, context.providerId, { expectedVersion: options.expectedVersion, serviceType: options.serviceType ?? "REPAIR", unitsConsumed: options.unitsConsumed ?? 1 });
    await context.assertStateRefCurrent(context.authorizationStateRef);
    const event: ServiceEventRecord = { eventVersion: 2, eventId: options.serviceEventId, entitlementId: id, providerId: context.providerId, claimant: context.claimant, serviceType: options.serviceType ?? "REPAIR", unitsConsumed: options.unitsConsumed ?? 1, requestHash: options.requestHash, authorizationStateRef: context.authorizationStateRef, authorizationEvidenceHash: context.authorizationEvidenceHash, entitlementVersionBefore: current.version, entitlementVersionAfter: next.version, remainingClaimsAfter: next.remainingClaims, occurredAt: next.updatedAt };
    this.coverage.set(id,next); const list=this.events.get(id)??[]; list.push(event); this.events.set(id,list); this.idempotency.set(key,{fingerprint,coverage:clone(next),event:clone(event)}); return { coverage: clone(next), event: clone(event) };
  }
  async listServiceEvents(id: EntitlementId, filter: ServiceEventListFilter = {}) { this.require(id); return (this.events.get(id)??[]).filter(e=>!filter.providerId||e.providerId===filter.providerId).map(clone); }
  async setStatus(id: EntitlementId, issuerId: string, status: EntitlementStatus, options: MutationOptions) { const next=setCoverageStatus(this.require(id),issuerId,status,options); this.coverage.set(id,next); return clone(next); }
  async health(): Promise<LedgerHealth> { return { mode:"memory", ready:true, detail:"split in-memory CareCoverageStore" }; }
  async reset(){ this.coverage.clear(); this.events.clear(); this.idempotency.clear(); }
  private require(id:string){const row=this.coverage.get(id); if(!row) throw new SkillPassError("NOT_FOUND","entitlement not found",404); return row;}
}
function clone<T>(v:T):T{return structuredClone(v);}
