# Code Map — v0.5

```text
apps/api/src/app.ts
  authenticated Care HTTP API
  typed service events
  scoped history reads
  issuer/owner/provider boundaries

apps/api/src/owner-proof.ts
  request-bound owner proof
  binds serviceEventId + serviceType + unitsConsumed

apps/api/src/demo-session.ts
  stateless public demo
  rich Alice -> service -> Bob -> service lifecycle

apps/web/src/App.tsx
  product-first demo + reviewer view

packages/core/src/model.ts
  Care entitlement/application state

packages/core/src/plans.ts
  reference Care plans and allowed service types

packages/core/src/policy.ts
  pure authorization checks

packages/core/src/transitions.ts
  transfer, service consumption, status transitions

packages/ckb-adapter/src/memory.ts
  single-process pilot coverage store
  typed service-event history
  idempotency + optimistic concurrency

packages/ckb-adapter/src/ckb.ts
  fail-closed CKB integration boundary

packages/ckb-adapter/src/cell-schema.ts
  deprecated legacy Care Cell prototype codec

packages/provider-sdk/src/index.ts
  provider verification + pilot signed evidence

packages/shared/src/index.ts
  cross-package DTOs, proof/evidence/service-event types
```

The target SkillPass integration is documented in `SKILLPASS_INTEGRATION.md` and intentionally does not collapse Care's business state into the portable ownership protocol.
