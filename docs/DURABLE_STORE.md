# Durable Care Store

SkillPass Care contains both an in-memory Care store for deterministic demos/tests and a PostgreSQL implementation for durable application state.

`db/001_care_coverage.sql` is the reference PostgreSQL schema.

## Important ownership rule

The durable Care database intentionally has **no authoritative owner column**. Current ownership belongs to SkillPass/CKB and must be resolved through `SkillPassOwnershipPort`.

## What is durable in Care

- entitlement/Care identity mapping;
- product commitment;
- service class / plan state;
- remaining coverage;
- accepted providers;
- issuer-controlled status and optimistic version;
- typed service-event history;
- the SkillPass `authorization_state_ref` and hash of provider authorization evidence used for each committed service event.

## One domain transition implementation

Memory and PostgreSQL do not maintain separate business-rule implementations.

Both use helpers in `packages/care-store/src/domain.ts`, which delegate to `@skillpass-care/core` for:

- optimistic version checks;
- active/suspended/revoked semantics;
- expiry;
- accepted-provider policy;
- remaining-unit checks;
- Care-plan service-type rules;
- issuer-controlled status transitions.

This prevents a durable deployment from accepting a service event that the reference memory implementation would reject.

## Atomic service transaction

The PostgreSQL path performs the service transition as one transaction:

1. check the canonical SkillPass authorization `stateRef`;
2. `SELECT ... FOR UPDATE` the Care coverage row;
3. run the shared Care transition;
4. update coverage under the expected version;
5. insert the typed service event;
6. re-check the SkillPass `stateRef` immediately before commit;
7. commit both changes together.

If the final liveness check fails, PostgreSQL rolls back both the coverage change and service-event insert.

## Idempotency

`(provider_id, event_id)` is the durable idempotency key. An exact retry returns the original event/result without consuming another unit. Reusing the same key for a different claimant, request hash, service type, units, entitlement, or SkillPass state reference returns `IDEMPOTENCY_CONFLICT`.

## Concurrency

PostgreSQL serializes a coverage mutation using a row lock plus optimistic version predicate. The in-memory reference store mirrors the single-winner property with a per-entitlement mutation queue, so the final-unit concurrency test has the same semantics in both modes.

## Why this is off-chain

Detailed service history, operational metadata and customer-service data do not need to be public CKB state. SkillPass remains the portable ownership/authorization primitive; Care remains responsible for the vertical service product.
