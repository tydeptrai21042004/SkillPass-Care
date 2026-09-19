# Code Map — v0.4

## `packages/shared`
Identifiers, challenge/proof DTOs, signed-evidence shape, idempotent claim options, scoped ledger filters and stable errors.

## `packages/core`
- `model.ts` — `ServiceRight`, `schemaVersion`, product commitment.
- `policy.ts` — pure state authorization.
- `transitions.ts` — mandatory-version transfer/claim/status transitions.

## `packages/ckb-adapter`
- `types.ts` — ledger contract.
- `memory.ts` — scoped reads, optimistic transitions and replay-safe claim idempotency.
- `cell-schema.ts` — strict deterministic V1 prototype Cell-data encoding; intentionally excludes owner.
- `live-cell.ts` — fail-closed uniqueness helper for canonical live-Cell resolution.
- `ckb.ts` — RPC health + fail-closed unimplemented state operations.

## `packages/provider-sdk`
Latest-state verification plus canonical request hashing, state references and optional `HMAC-SHA256-PILOT` evidence signing.

## `packages/config`
Production secret/credential validation, challenge TTL, CORS and ledger configuration.

## `apps/api`
- `auth.ts` — actor authentication.
- `owner-proof.ts` — stateless signed challenge tokens, canonical owner message and pilot proof verification.
- `app.ts` — scoped routes, owner-proof flow, idempotent claim boundary, error mapping.
- `runtime.ts` — config + ledger selection.

## `apps/web`
Uses only `/demo/*` for the public Alice→Bob showcase. It does not pretend to exercise authenticated owner proof or on-chain CKB transitions.

## `api/router.ts`
Only Vercel function entrypoint. Legacy `api/index.ts` and `api/[...path].ts` were removed to avoid routing ambiguity.
