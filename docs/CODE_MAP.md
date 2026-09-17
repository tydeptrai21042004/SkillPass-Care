# Code Map

## `packages/shared`
Cross-package identifiers, verification evidence, mutation options, health DTOs and stable `SkillPassError` codes.

## `packages/core`
- `model.ts`: `ServiceRight` and creation input.
- `policy.ts`: pure provider authorization decision logic.

No HTTP, React or ledger calls belong here.

## `packages/ckb-adapter`
- `types.ts`: ledger contract.
- `memory.ts`: deterministic executable pilot ledger with version checks, claims and status transitions.
- `ckb.ts`: fail-closed CKB boundary plus RPC diagnostics. It does not simulate on-chain writes.

## `packages/provider-sdk`
Provider-side verification helper. Provider identity is fixed at construction and every verification returns evidence with claimant/provider/version/time.

## `packages/config`
Environment parsing, credential maps, CORS origins and the production rule that demo endpoints cannot be enabled.

## `apps/api`
- `auth.ts`: pilot server-to-server/shared-secret actor authentication.
- `app.ts`: schemas, authenticated routes, isolated demo routes, health and stable error mapping.
- `server.ts`: `.env` loading, ledger selection and startup.

## `apps/web`
- `api.ts`: browser client that talks only to demo routes for actor simulation.
- `App.tsx`: Product and Reviewer views plus guided Alice→Bob lifecycle.

## Tests

- `packages/core/test`: authorization policy matrix.
- `packages/ckb-adapter/test`: mutation invariants, final-claim race, versions and lifecycle status.
- `packages/provider-sdk/test`: provider evidence and transfer behavior.
- `apps/api/test`: API identity binding, error behavior, lifecycle and demo isolation.
