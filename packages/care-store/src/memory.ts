import { randomUUID } from "node:crypto";
import type { CareCoverage, CreateCareCoverageInput } from "@skillpass-care/core";
import { SkillPassError, type ClaimMutationOptions, type EntitlementId, type EntitlementStatus, type LedgerHealth, type LedgerListFilter, type MutationOptions, type ServiceEventListFilter, type ServiceEventRecord } from "@skillpass-care/shared";
import { applyCareConsumption, applyCareStatusTransition, initializeCareCoverage, serviceEventFingerprint } from "./domain.js";
import type { CareConsumptionContext, CareCoverageStore } from "./types.js";

export class InMemoryCareStore implements CareCoverageStore {
  private coverage = new Map<string, CareCoverage>();
  private events = new Map<string, ServiceEventRecord[]>();
  private idempotency = new Map<string, { fingerprint: string; coverage: CareCoverage; event: ServiceEventRecord }>();
  private mutationTails = new Map<string, Promise<void>>();

  async create(input: CreateCareCoverageInput): Promise<CareCoverage> {
    const id = input.id ?? `ent-${randomUUID()}`;
    if (this.coverage.has(id)) throw new SkillPassError("VERSION_CONFLICT", "entitlement already exists", 409);
    const row = initializeCareCoverage(input, id);
    this.coverage.set(id, row);
    this.events.set(id, []);
    return clone(row);
  }

  async get(id: EntitlementId) {
    const row = this.coverage.get(id);
    return row ? clone(row) : undefined;
  }

  async list(filter: Omit<LedgerListFilter, "owner"> = {}) {
    return [...this.coverage.values()]
      .filter((coverage) => (!filter.issuerId || coverage.issuerId === filter.issuerId)
        && (!filter.providerId || coverage.acceptedProviderIds.includes(filter.providerId)))
      .map(clone);
  }

  async consume(id: EntitlementId, context: CareConsumptionContext, options: ClaimMutationOptions) {
    return this.withMutationLock(id, async () => {
      const key = `${context.providerId}:${options.serviceEventId}`;
      const fingerprint = serviceEventFingerprint(id, context, options);
      const prior = this.idempotency.get(key);
      if (prior) {
        if (prior.fingerprint !== fingerprint) {
          throw new SkillPassError("IDEMPOTENCY_CONFLICT", "serviceEventId was already used for a different service request", 409);
        }
        return { coverage: clone(prior.coverage), event: clone(prior.event) };
      }

      const current = this.require(id);
      await context.assertStateRefCurrent(context.authorizationStateRef);
      const result = applyCareConsumption(current, context, options);
      // Re-check immediately before the application-state commit so a transfer
      // observed during the operation fails closed without consuming coverage.
      await context.assertStateRefCurrent(context.authorizationStateRef);

      this.coverage.set(id, result.coverage);
      const list = this.events.get(id) ?? [];
      list.push(result.event);
      this.events.set(id, list);
      this.idempotency.set(key, {
        fingerprint,
        coverage: clone(result.coverage),
        event: clone(result.event)
      });
      return { coverage: clone(result.coverage), event: clone(result.event) };
    });
  }

  async listServiceEvents(id: EntitlementId, filter: ServiceEventListFilter = {}) {
    this.require(id);
    return (this.events.get(id) ?? [])
      .filter((event) => !filter.providerId || event.providerId === filter.providerId)
      .map(clone);
  }

  async setStatus(id: EntitlementId, issuerId: string, status: EntitlementStatus, options: MutationOptions) {
    return this.withMutationLock(id, async () => {
      const current = this.require(id);
      const next = applyCareStatusTransition(current, issuerId, status, options);
      this.coverage.set(id, next);
      return clone(next);
    });
  }

  async health(): Promise<LedgerHealth> {
    return { mode: "memory", ready: true, careStoreMode: "memory", detail: "split in-memory CareCoverageStore" };
  }

  async reset() {
    this.coverage.clear();
    this.events.clear();
    this.idempotency.clear();
    this.mutationTails.clear();
  }

  private require(id: string) {
    const row = this.coverage.get(id);
    if (!row) throw new SkillPassError("NOT_FOUND", "entitlement not found", 404);
    return row;
  }

  private async withMutationLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.mutationTails.get(id) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => gate);
    this.mutationTails.set(id, tail);
    await previous;
    try {
      return await fn();
    } finally {
      release();
      if (this.mutationTails.get(id) === tail) this.mutationTails.delete(id);
    }
  }
}

function clone<T>(value: T): T { return structuredClone(value); }
