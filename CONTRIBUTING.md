# Contributing

## Design rules

1. Keep blockchain-specific code inside `packages/ckb-adapter`.
2. Keep state authorization policy pure and independently testable.
3. Never treat a caller-supplied claimant string as proof of identity.
4. In CKB mode, derive authoritative ownership from the canonical live Cell lock, never duplicated Cell data.
5. Do not put customer PII or raw predictable product identifiers into the entitlement object.
6. Keep `schemaVersion` separate from mutable state `version`.
7. Mutating off-chain operations require explicit concurrency/idempotency preconditions.
8. Do not claim physical-product ownership is cryptographically proven unless the product itself is represented in the protocol.
9. Do not add a feature unless it supports a pilot hypothesis, security invariant, interoperability need, or production requirement.
10. Add a test for every authorization, transfer, proof, replay, or Cell-resolution invariant.

## Pull request checklist

- [ ] `npm run preflight` passes.
- [ ] TypeScript changes are typed.
- [ ] Authorization/security changes include positive and negative tests.
- [ ] Replay/idempotency behavior is explicit for mutations.
- [ ] Documentation reflects actual public behavior.
- [ ] Demo-only and pilot-only cryptography is clearly labeled.
- [ ] New CKB assumptions are documented in `docs/ARCHITECTURE.md` / `docs/CKB_CELL_SCHEMA.md`.
- [ ] No new route broadens actor data access unintentionally.
