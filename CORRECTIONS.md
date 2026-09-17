# Correction Summary — v0.2.0

## Implemented

- Authenticated issuer/provider/owner boundaries for non-demo HTTP routes.
- Demo-only actor simulation isolated under `/demo/*` and forbidden in production configuration.
- Stable domain/API errors with correct 400/401/403/404/409/503 classes.
- Optimistic `expectedVersion` protection for mutable entitlement state.
- `ACTIVE` / `SUSPENDED` / irreversible `REVOKED` lifecycle.
- Claim exhaustion and same-process final-claim concurrency protection/tests.
- Provider verification evidence (provider, claimant, entitlement version, timestamp).
- Separate liveness and readiness endpoints.
- CKB RPC diagnostic probe with fail-closed readiness/state operations.
- Correct TypeScript build output layout (`src` only) plus separate test typecheck configs.
- Root `.env` loading for the API and root Vite `envDir` for the web application.
- `.env.example`, `.gitignore`, GitHub Actions CI and updated Docker/local configuration.
- Product/reviewer UI split and clearer lifecycle activity evidence.
- Expanded tests and corrected documentation.

## Deliberately not faked

The repository does not fabricate a live CKB transfer. `LEDGER_MODE=ckb` remains not-ready until a versioned SkillPass Cell schema, deployed type script, wallet-signed transaction construction, live-Cell resolver, confirmation policy and durable multi-provider claim semantics are implemented.

## Validation performed in the correction environment

- Parsed every `package.json` successfully.
- TypeScript/TSX syntax transpilation passed across the source tree.
- Executed a dependency-free runtime invariant check of the core/memory/provider lifecycle, including Alice→Bob authorization movement, stale version rejection and concurrent final-claim behavior.
- Full `npm install`/Vitest/build could not be executed because the correction environment could not reach the npm registry; no lockfile or passing-test claim was fabricated.
