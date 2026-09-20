# Roadmap

## Phase 0 — Rich Care reference product (current)

- [x] portable service-right lifecycle
- [x] current-owner proof semantics
- [x] reference Care plans and typed service requests
- [x] coverage units preserved across ownership transfer
- [x] typed service-event audit trail
- [x] provider/event idempotency
- [x] service type + units bound into owner proof
- [x] stale-owner service commit rejection
- [x] cross-provider continuity: Provider A -> transfer -> Provider B
- [x] actor-scoped entitlement and service-history reads
- [x] issuer suspend/resume/revoke controls
- [x] public reviewer/product demo
- [x] explicit SkillPass-vs-Care architecture boundary

## Phase 1 — Durable Care application state

- [ ] PostgreSQL/transactional coverage store
- [ ] event-table uniqueness on `(provider_id, event_id)`
- [ ] atomic quota decrement + service-event insert
- [ ] migration/rebuild check from event history
- [ ] status reason/audit event without exposing sensitive free text
- [ ] provider/issuer operational views backed by durable data

## Phase 2 — Canonical SkillPass testnet bridge

- [ ] pin a released SkillPass protocol/SDK version
- [ ] map `productCommitment` to the SkillPass subject commitment
- [ ] map Care plan commitment to SkillPass `policyHash`
- [ ] resolve authoritative current owner from SkillPass live CKB state
- [ ] wallet-signed owner challenge proof
- [ ] real Alice -> Bob transfer transaction
- [ ] reject service commit when the referenced ownership state becomes stale
- [ ] preserve Care quota/history across the real transfer

## Phase 3 — Independent providers

- [ ] Provider A and Provider B on separate deployments
- [ ] no shared process memory or authoritative owner table
- [ ] asymmetric provider evidence and key rotation
- [ ] provider manifest/policy metadata
- [ ] external provider integration using public docs only
- [ ] measure integration time, errors and support questions

## Phase 4 — Controlled pilot

- [ ] 5 provider/seller interviews
- [ ] 5 buyer/user interviews
- [ ] 10–20 controlled products/users if demand is confirmed
- [ ] at least one real product handoff paired with entitlement transfer
- [ ] second owner receives service from another accepted provider
- [ ] publish anonymized results, including failures and negative feedback
