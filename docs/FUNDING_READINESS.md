# Funding Readiness Checklist

This checklist keeps technical proof, product proof and market evidence separate.

## Technical / product evidence

- [x] local Alice -> Bob transfer lifecycle
- [x] Care plan model with allowed service types
- [x] coverage consumption before and after ownership transfer
- [x] cross-provider continuity: Provider A -> transfer -> Provider B
- [x] typed auditable service-event records
- [x] owner proof binds service type + units + event ID
- [x] stale pre-transfer owner/service proof rejection
- [x] replay-safe service-event idempotency
- [x] final-unit concurrency test
- [x] actor-scoped entitlement reads
- [x] actor-scoped service-history reads
- [x] issuer suspend/resume/irreversible revoke rules
- [x] privacy-preserving salted product commitment helper
- [x] signed pilot provider authorization evidence
- [x] explicit SkillPass-vs-Care responsibility boundary
- [x] fail-closed CKB adapter
- [ ] durable transactional Care store
- [ ] canonical SkillPass Capability V2 bridge
- [ ] real SkillPass/CKB testnet owner resolution
- [ ] wallet-signed owner proof and transfer
- [ ] asymmetric provider evidence + key rotation

## Market / integration evidence

- [ ] five provider/seller interviews
- [ ] five buyer/user interviews
- [ ] first external provider integration
- [ ] second external provider integration or independent conformance run
- [ ] controlled pilot cohort
- [ ] at least one real product handoff paired with entitlement transfer
- [ ] real second-owner service event

## Flagship funding acceptance test

```text
Alice: 3 units
Provider A diagnostic -> 2
transfer Alice -> Bob
Alice denied
Provider B authorizes Bob
Provider B repair -> 1
history preserves both provider events
```

When the SkillPass testnet bridge is connected, the exact same application test should run with ownership sourced from real live CKB state instead of the memory pilot.

## Proposal rule

Do not call internal demo activity "market validation". Report interviews, integration commitments, successful integrations and actual service usage separately.
