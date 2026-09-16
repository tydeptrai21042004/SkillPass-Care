# Roadmap

## Phase 0 — Local pilot scaffold (this repository)

- [x] domain model
- [x] provider-independent verifier
- [x] transfer lifecycle
- [x] claim lifecycle
- [x] demo API and UI
- [x] testable in-memory ledger
- [x] documentation

## Phase 1 — CKB testnet adapter

- [ ] implement CCC transaction builder
- [ ] define service-right Cell data/type-script schema
- [ ] discover canonical live Cell via indexer
- [ ] verify owner lock script
- [ ] consume/create Cell during transfer
- [ ] confirmation/reorg policy
- [ ] deterministic entitlement ID

## Phase 2 — Independent providers

- [ ] extract provider SDK as versioned package
- [ ] sign provider manifests
- [ ] Provider A runs independently
- [ ] Provider B runs independently
- [ ] measure integration time

## Phase 3 — Real-world pilot

- [ ] 10-20 users/products
- [ ] record real transfer
- [ ] second-owner service event
- [ ] publish anonymized metrics

## Phase 4 — Funding readiness

- [ ] Spark completion report
- [ ] reproducible testnet verification
- [ ] external security review plan
- [ ] narrow Community Fund proposal only if demand is demonstrated
