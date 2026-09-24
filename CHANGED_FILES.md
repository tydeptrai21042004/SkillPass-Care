# Changed Files — SkillPass Care canonical-ownership / durable-state hardening

This patch keeps the existing top-level repository structure and focuses on the CKBuilder-review-critical boundary between canonical SkillPass ownership and Care application state.

## Core changes

- `packages/care-store/src/domain.ts` — one shared Care transition layer used by memory and PostgreSQL.
- `packages/care-store/src/memory.ts` — shared rules, duplicate-create protection, per-entitlement mutation serialization.
- `packages/care-store/src/postgres.ts` — row-locked domain transitions, exact idempotent retries, atomic service event + coverage commit, shared status rules.
- `packages/ckb-adapter/src/canonical-ownership.ts` — request/evidence identity checks and canonical stateRef enforcement.
- `packages/ckb-adapter/src/split-ledger.ts` — canonical Care attachment to an existing SkillPass entitlement; no fake on-chain issuance.
- `apps/api/src/runtime.ts` — injectable `CanonicalSkillPassOwnership + CareCoverageStore` composition.
- `skillpass.protocol.json` — machine-readable compatibility contract with the core SkillPass repo.

## Tests added

- `packages/care-store/test/domain.test.ts`
- `packages/ckb-adapter/test/canonical-ownership.test.ts`
- `packages/ckb-adapter/test/split-canonical.test.ts`
- `apps/api/test/runtime.test.ts`

## Repository/reviewer hardening

- restored `.env.example`, `.gitignore`, `.dockerignore`, `.github/workflows/ci.yml`;
- removed stale `api/index.ts` and `api/[...path].ts` entrypoints;
- strengthened preflight and Care-boundary verification;
- updated README/status/integration/durable-store/verification docs;
- added `docs/NON_GOALS.md` and Provider B example;
- UI wording now says **No shared entitlement-owner database** instead of the broader/incorrect “No shared customer database”.

## Validation in this environment

- dependency-free Care preflight: PASS;
- Care architecture/boundary verifier: PASS;
- cross-repo `ckb-skill` Care compatibility verifier: PASS;
- targeted TypeScript typecheck for shared/core/Care-domain/memory/canonical adapter: PASS;
- targeted PostgreSQL source typecheck with local interface stubs: PASS;
- Node TypeScript syntax checks for changed `.ts` files: PASS.

Full npm/Vitest execution could not be performed in this environment because npm registry DNS access returned `EAI_AGAIN`. Run `npm install --no-audit --no-fund && npm run check` in a networked environment before merging.
