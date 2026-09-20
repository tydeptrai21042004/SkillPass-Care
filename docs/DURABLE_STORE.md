# Durable Care Store

The in-memory ledger is useful for deterministic demos and tests, but the Care business state must be durable for a real pilot.

`db/001_care_coverage.sql` provides the reference PostgreSQL schema.

## Important ownership rule

The durable Care database intentionally has **no authoritative owner column**. A live deployment resolves the current owner through SkillPass/CKB. This prevents the Care application database from silently becoming a second ownership source of truth.

## What is durable in Care

- entitlement/Care identity mapping;
- product commitment;
- service class / policy state;
- remaining coverage;
- accepted providers;
- status and optimistic version;
- typed service-event history.

## Atomic service transaction

A production service commit should:

1. validate the current SkillPass ownership snapshot and owner proof;
2. begin a database transaction;
3. update coverage using `WHERE version = expectedVersion AND remaining_claims >= units`;
4. require exactly one updated row;
5. insert the service event under unique `(provider_id, event_id)`;
6. commit;
7. return the new Care state and event evidence.

If the SkillPass ownership state changed between authorization and commit, abort before modifying Care state and require fresh authorization.

## Why this is off-chain

Detailed service history, provider operational data and customer-service metadata do not need to be public CKB state. SkillPass remains the portable ownership/authorization primitive; Care remains responsible for the vertical service product.
