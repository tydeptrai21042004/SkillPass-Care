# SkillPass Care Status — v0.5

## Implemented in this repository

- rich second-owner demo lifecycle;
- Care plans and allowed service types;
- remaining coverage quota;
- Alice -> Bob transfer semantics in the pilot model;
- typed service-event history;
- provider/event idempotency;
- service type + unit binding in owner proof;
- stale-owner rejection after transfer;
- cross-provider coverage continuity tests;
- issuer suspend/resume/revoke transitions;
- actor-scoped reads and provider-scoped service history;
- salted product-commitment helper;
- signed pilot provider authorization evidence;
- explicit SkillPass-vs-Care responsibility boundary;
- Vercel-safe public demo session.

## Intentionally not claimed as complete

- real SkillPass Capability V2 package integration;
- deployed CKB type script / live Cell resolution;
- wallet-signed transfer and owner proof;
- durable multi-instance Care database;
- asymmetric production provider signatures;
- real user/provider market validation.

## Next funding-critical milestone

Connect the existing Care lifecycle to the canonical SkillPass testnet ownership path without removing Care's own coverage/service state. The acceptance flow is:

```text
Alice owns SkillPass right + 3 Care units
Provider A service -> 2
real SkillPass transfer Alice -> Bob
Alice denied
Provider B service -> 1
Care history preserves both service events
```
