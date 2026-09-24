import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Pool as PgPool, PoolClient } from "pg";
import type { CareCoverage, CreateCareCoverageInput } from "@skillpass-care/core";
import { SkillPassError, type ClaimMutationOptions, type EntitlementStatus, type LedgerHealth, type LedgerListFilter, type MutationOptions, type ServiceEventListFilter, type ServiceEventRecord } from "@skillpass-care/shared";
import { applyCareConsumption, applyCareStatusTransition, coverageAtServiceEvent, initializeCareCoverage, serviceEventMatches } from "./domain.js";
import type { CareConsumptionContext, CareCoverageStore } from "./types.js";

const { Pool } = pg;

type Queryable = { query: (query: string, params?: unknown[]) => Promise<any> };

export class PostgresCareStore implements CareCoverageStore {
  private readonly pool: PgPool;

  constructor(connectionString: string | PgPool) {
    this.pool = typeof connectionString === "string" ? new Pool({ connectionString }) : connectionString;
  }

  async health(): Promise<LedgerHealth> {
    try {
      await this.pool.query("select 1");
      return { mode: "postgres", ready: true, careStoreMode: "postgres", detail: "durable PostgreSQL Care store" };
    } catch (error) {
      return {
        mode: "postgres",
        ready: false,
        careStoreMode: "postgres",
        detail: error instanceof Error ? error.message : "PostgreSQL unavailable"
      };
    }
  }

  async create(input: CreateCareCoverageInput): Promise<CareCoverage> {
    const id = input.id ?? `ent-${randomUUID()}`;
    const initial = initializeCareCoverage(input, id);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO care_coverage(
          entitlement_id,issuer_id,product_commitment,service_class,remaining_claims,
          status,version,transferable,expires_at,created_at,updated_at
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          initial.id, initial.issuerId, initial.productCommitment, initial.serviceClass,
          initial.remainingClaims, initial.status, initial.version, initial.transferable,
          initial.expiresAt, initial.createdAt, initial.updatedAt
        ]
      );
      for (const providerId of initial.acceptedProviderIds) {
        await client.query(
          `INSERT INTO care_provider_acceptance(entitlement_id,provider_id) VALUES($1,$2)`,
          [initial.id, providerId]
        );
      }
      await client.query("COMMIT");
      return this.inflate(client, inserted.rows[0]);
    } catch (error: any) {
      await client.query("ROLLBACK");
      if (error?.code === "23505") throw new SkillPassError("VERSION_CONFLICT", "entitlement already exists", 409);
      throw error;
    } finally {
      client.release();
    }
  }

  async get(id: string) {
    const query = await this.pool.query(`SELECT * FROM care_coverage WHERE entitlement_id=$1`, [id]);
    if (!query.rowCount) return undefined;
    return this.inflate(this.pool, query.rows[0]);
  }

  async list(filter: Omit<LedgerListFilter, "owner"> = {}) {
    const query = await this.pool.query(
      `SELECT DISTINCT c.*
       FROM care_coverage c
       LEFT JOIN care_provider_acceptance p ON p.entitlement_id=c.entitlement_id
       WHERE ($1::text IS NULL OR c.issuer_id=$1)
         AND ($2::text IS NULL OR p.provider_id=$2)
       ORDER BY c.created_at`,
      [filter.issuerId ?? null, filter.providerId ?? null]
    );
    return Promise.all(query.rows.map((row: any) => this.inflate(this.pool, row)));
  }

  async consume(id: string, context: CareConsumptionContext, options: ClaimMutationOptions) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const prior = await client.query(
        `SELECT * FROM care_service_event WHERE provider_id=$1 AND event_id=$2 FOR UPDATE`,
        [context.providerId, options.serviceEventId]
      );
      if (prior.rowCount) {
        const event = mapEvent(prior.rows[0]);
        if (!serviceEventMatches(event, id, context, options)) {
          throw new SkillPassError("IDEMPOTENCY_CONFLICT", "serviceEventId was already used for a different service request", 409);
        }
        const current = await this.getWithClient(client, id, true);
        const originalCoverage = coverageAtServiceEvent(current, event);
        await client.query("COMMIT");
        return { coverage: originalCoverage, event };
      }

      // First chain check occurs before the row lock to avoid holding a DB lock
      // while the obvious stale-owner case is rejected.
      await context.assertStateRefCurrent(context.authorizationStateRef);
      const current = await this.getWithClient(client, id, true);

      // A concurrent identical retry may have inserted the event while this
      // transaction waited on the coverage row lock. Re-check after acquiring
      // the lock so exact retries return the original result instead of a
      // misleading version conflict.
      const racedPrior = await client.query(
        `SELECT * FROM care_service_event WHERE provider_id=$1 AND event_id=$2`,
        [context.providerId, options.serviceEventId]
      );
      if (racedPrior.rowCount) {
        const event = mapEvent(racedPrior.rows[0]);
        if (!serviceEventMatches(event, id, context, options)) {
          throw new SkillPassError("IDEMPOTENCY_CONFLICT", "serviceEventId was already used for a different service request", 409);
        }
        const originalCoverage = coverageAtServiceEvent(current, event);
        await client.query("COMMIT");
        return { coverage: originalCoverage, event };
      }

      const result = applyCareConsumption(current, context, options);

      const updated = await client.query(
        `UPDATE care_coverage
         SET remaining_claims=$1, version=$2, updated_at=$3
         WHERE entitlement_id=$4 AND version=$5
         RETURNING entitlement_id`,
        [
          result.coverage.remainingClaims,
          result.coverage.version,
          result.coverage.updatedAt,
          id,
          current.version
        ]
      );
      if (updated.rowCount !== 1) {
        throw new SkillPassError("VERSION_CONFLICT", "coverage changed during service consumption", 409);
      }

      await client.query(
        `INSERT INTO care_service_event(
          provider_id,event_id,entitlement_id,claimant,service_type,units_consumed,
          request_hash,authorization_state_ref,authorization_evidence_hash,
          entitlement_version_before,entitlement_version_after,remaining_claims_after,occurred_at
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          result.event.providerId,
          result.event.eventId,
          result.event.entitlementId,
          result.event.claimant,
          result.event.serviceType,
          result.event.unitsConsumed,
          result.event.requestHash,
          result.event.authorizationStateRef,
          result.event.authorizationEvidenceHash,
          result.event.entitlementVersionBefore,
          result.event.entitlementVersionAfter,
          result.event.remainingClaimsAfter,
          result.event.occurredAt
        ]
      );

      // Final fail-closed liveness check immediately before COMMIT. A transfer
      // seen here rolls the Care mutation and service-event insert back together.
      await context.assertStateRefCurrent(context.authorizationStateRef);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listServiceEvents(id: string, filter: ServiceEventListFilter = {}) {
    const query = await this.pool.query(
      `SELECT * FROM care_service_event
       WHERE entitlement_id=$1 AND ($2::text IS NULL OR provider_id=$2)
       ORDER BY occurred_at,event_id`,
      [id, filter.providerId ?? null]
    );
    return query.rows.map(mapEvent);
  }

  async setStatus(id: string, issuerId: string, status: EntitlementStatus, options: MutationOptions) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await this.getWithClient(client, id, true);
      const next = applyCareStatusTransition(current, issuerId, status, options);
      if (next.version === current.version) {
        await client.query("COMMIT");
        return next;
      }
      const updated = await client.query(
        `UPDATE care_coverage
         SET status=$1, version=$2, updated_at=$3
         WHERE entitlement_id=$4 AND version=$5
         RETURNING entitlement_id`,
        [next.status, next.version, next.updatedAt, id, current.version]
      );
      if (updated.rowCount !== 1) throw new SkillPassError("VERSION_CONFLICT", "coverage status changed concurrently", 409);
      await client.query("COMMIT");
      return next;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async getWithClient(client: PoolClient, id: string, forUpdate = false) {
    const query = await client.query(
      `SELECT * FROM care_coverage WHERE entitlement_id=$1${forUpdate ? " FOR UPDATE" : ""}`,
      [id]
    );
    if (!query.rowCount) throw new SkillPassError("NOT_FOUND", "entitlement not found", 404);
    return this.inflate(client, query.rows[0]);
  }

  private async inflate(queryable: Queryable, row: any): Promise<CareCoverage> {
    const providers = await queryable.query(
      `SELECT provider_id FROM care_provider_acceptance WHERE entitlement_id=$1 ORDER BY provider_id`,
      [row.entitlement_id]
    );
    return {
      schemaVersion: 1,
      id: row.entitlement_id,
      issuerId: row.issuer_id,
      productCommitment: row.product_commitment,
      serviceClass: row.service_class,
      remainingClaims: Number(row.remaining_claims),
      expiresAt: new Date(row.expires_at).toISOString(),
      transferable: row.transferable,
      acceptedProviderIds: providers.rows.map((provider: any) => provider.provider_id),
      status: row.status,
      version: Number(row.version),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }
}

function mapEvent(row: any): ServiceEventRecord {
  return {
    eventVersion: 2,
    eventId: row.event_id,
    entitlementId: row.entitlement_id,
    providerId: row.provider_id,
    claimant: row.claimant,
    serviceType: row.service_type,
    unitsConsumed: Number(row.units_consumed),
    requestHash: row.request_hash,
    authorizationStateRef: row.authorization_state_ref,
    authorizationEvidenceHash: row.authorization_evidence_hash,
    entitlementVersionBefore: Number(row.entitlement_version_before),
    entitlementVersionAfter: Number(row.entitlement_version_after),
    remainingClaimsAfter: Number(row.remaining_claims_after),
    occurredAt: new Date(row.occurred_at).toISOString()
  };
}
