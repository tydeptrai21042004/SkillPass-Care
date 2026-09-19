# Correction Summary — v0.4.0

## Protocol/security

- Added request-bound owner proof-of-possession for authenticated provider verification and claims.
- Added stateless signed challenge tokens with short TTL and domain-separated canonical messages.
- Bound claim challenges to a provider-generated `serviceEventId`.
- Added replay-safe claim idempotency keyed by provider + service event and bound to request hash.
- Added signed pilot authorization evidence with request hash, state reference, expiry and explicit `HMAC-SHA256-PILOT` labeling.
- Scoped list/detail reads by issuer, owner or accepted provider.
- Production validation now requires strong demo/challenge secrets and complete pilot credentials when applicable.
- Malformed JSON now returns a stable `400 VALIDATION_ERROR` instead of falling through to 500.

## Domain/CKB boundary

- Renamed `productHash` to `productCommitment` while retaining a temporary HTTP compatibility alias.
- Added `schemaVersion` independently from mutable state `version`.
- Added strict deterministic V1 prototype CKB Cell-data encoding/validation.
- Added fail-closed canonical live-Cell uniqueness checking.
- Intentionally excluded `owner` from Cell data; the target authoritative owner is the live Cell lock.
- Kept CKB reads/writes fail closed until the real protocol is deployed.

## Repository/deployment

- Removed conflicting `api/index.ts` and `api/[...path].ts`; `api/router.ts` is now the only Vercel function entrypoint.
- Made the router runtime lazy so URL conversion can be imported/tested without loading production configuration.
- Added `.env.example`, `.gitignore` and GitHub Actions CI.
- Removed hardcoded demo/memory deployment mode from `vercel.json`; deployment mode is environment-controlled.
- Exact-pinned direct dependency versions.
- Updated environment generator for the owner-proof challenge secret.
- Updated architecture, API, threat-model, deployment, provider and product documentation; added dedicated owner-proof and CKB-schema docs.

## Test expansion

- claimant proof requirement and invalid proof;
- challenge binding across providers;
- proof created before transfer still follows latest owner state;
- actor-scoped reads;
- claim idempotency and idempotency conflict;
- provider evidence signature verification;
- deterministic CKB data encoding with owner exclusion;
- production configuration hardening;
- malformed JSON handling;
- direct owner-proof token/proof expiry, tampering and stable claim-hash semantics.

## Validation environment note

Dependency installation from the npm registry timed out in this environment, so this file does not claim that Vitest/Vite dependency-backed checks passed here. No lockfile was fabricated. Run `npm install && npm run check` in a networked environment before merge/deploy and commit the resulting `package-lock.json`.
