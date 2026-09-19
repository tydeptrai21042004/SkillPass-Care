# Roadmap

## Phase 0 — Hardened protocol scaffold (current)

- [x] portable service-right lifecycle
- [x] provider-independent state verifier abstraction
- [x] claimant proof-of-possession semantics
- [x] request-bound short-lived challenges
- [x] actor-scoped reads
- [x] mandatory optimistic mutation version
- [x] replay-safe service-event idempotency
- [x] signed pilot authorization evidence
- [x] explicit protocol `schemaVersion`
- [x] V1 CKB Cell-data boundary with owner excluded from data
- [x] fail-closed CKB adapter
- [x] deployment/repository hardening and expanded tests

## Phase 1 — CKB testnet protocol

- [ ] finalize/review Molecule schema
- [ ] deploy SkillPass type script
- [ ] define deterministic entitlement identity/type args
- [ ] canonical live-Cell indexer resolver
- [ ] derive authoritative principal from live Cell lock
- [ ] wallet-signed owner challenge proof
- [ ] wallet-signed issue/transfer transactions
- [ ] define claim transition or durable receipt model
- [ ] confirmation-depth and reorg policy
- [ ] duplicate-live-cell invariant tests

## Phase 2 — Real independent providers

- [ ] package/version provider SDK
- [ ] asymmetric provider signing key + key rotation metadata
- [ ] signed provider manifests/policy versioning
- [ ] Provider A and Provider B run as separate deployments with no shared process memory
- [ ] both resolve the same CKB entitlement independently
- [ ] measure integration time and failure behavior

## Phase 3 — Controlled real-world pilot

- [ ] durable/off-chain fallback ledger only if needed before CKB completion
- [ ] 10–20 real products/users
- [ ] operationally pair physical-product sale with entitlement transfer
- [ ] record second-owner service event
- [ ] measure failed verification, transfer, claim and support cases
- [ ] publish anonymized evidence rather than market claims without data

## Phase 4 — Production/funding readiness

- [ ] external protocol/security review
- [ ] reproducible lockfile/build artifacts
- [ ] monitoring and credential/key rotation runbook
- [ ] provider onboarding guide backed by independent integration
- [ ] narrow funding proposal based on demonstrated pilot demand
