# SkillPass Care Status — v0.5

## Implemented in this repository

- rich second-owner demo lifecycle;
- Care plans and allowed service types;
- remaining coverage quota;
- Alice -> Bob transfer semantics in the pilot ownership simulator;
- typed service-event history with authorization-state/evidence hashes;
- provider/event idempotency;
- per-entitlement in-memory mutation serialization for concurrency tests;
- PostgreSQL Care store using the **same domain transition functions** as the memory store;
- transactional PostgreSQL coverage decrement + service-event insert;
- liveness re-check immediately before Care commit;
- service type + unit binding in owner proof;
- stale-owner rejection after transfer;
- cross-provider coverage continuity tests;
- issuer suspend/resume/revoke transitions;
- actor-scoped reads and provider-scoped service history;
- salted product-commitment helper;
- signed pilot provider authorization evidence;
- explicit SkillPass-vs-Care responsibility boundary;
- `skillpass.protocol.json` compatibility contract for SkillPass Capability V2;
- injectable `CanonicalSkillPassOwnership + CareCoverageStore` runtime composition;
- Vercel-safe public demo session and clean single API entrypoint.

## Intentionally not claimed as complete

- a concrete production binding from this repo to a deployed SkillPass Capability V2 resolver/verifier;
- deployed CKB type script / retained real Testnet lifecycle evidence in this repo;
- wallet-signed transfer and owner proof in the Care UI;
- asymmetric production provider signatures (current pilot evidence uses HMAC);
- production migration orchestration/managed PostgreSQL operations;
- real user/provider market validation;
- proof of physical possession or legal ownership of the associated product.

## Next funding-critical milestone

Inject a real canonical SkillPass Testnet ownership binding into the existing split runtime and retain reproducible evidence for:

```text
Alice owns SkillPass right + 3 Care units
Provider A service -> 2
real SkillPass transfer Alice -> Bob
Alice denied
Provider B service -> 1
Care history preserves both service events
```

The Care database must remain application state only; the current owner continues to come from the live SkillPass Capability Cell.
