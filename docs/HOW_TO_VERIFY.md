# How to Verify v0.5

## 1. Dependency-free repository checks

```bash
npm run verify:care
```

This verifies repository structure, package versioning, the single Vercel entrypoint, the Care-specific namespace, `skillpass.protocol.json`, the service-event surface and the documented SkillPass/Care boundary.

From the sibling `ckb-skill` repository, compatibility can also be checked with:

```bash
npm run verify:care-compat -- ../SkillPass-Care-main
```

## 2. Full checks

```bash
npm install --no-audit --no-fund
npm run check
```

A production release should commit a generated `package-lock.json` and switch CI/deployment to `npm ci`.

## 3. Flagship public demo

Run `npm run dev` and execute:

```text
Reset
Provider A verifies Alice
Alice diagnostic: 3 -> 2
transfer Alice -> Bob
Provider A rejects Alice
Provider B verifies Bob
Bob repair: 2 -> 1
```

Expected property: ownership changes, but remaining Care coverage and service history are preserved.

## 4. Shared domain-rule verification

The memory and PostgreSQL stores both use `packages/care-store/src/domain.ts`. Tests must show:

- plan/service-type rejection;
- unit/quota rejection;
- provider acceptance;
- expiry/status rejection;
- optimistic version conflict;
- irreversible revocation;
- exact service-event idempotency.

## 5. Request-tampering test

Request owner approval for `DIAGNOSTIC / 1 unit`, then submit the proof as `REPAIR / 1 unit` or change `unitsConsumed`.

Expected: `401 CHALLENGE_INVALID`.

## 6. Transfer-race test

1. Create a service challenge/proof for Alice.
2. Transfer the right Alice -> Bob.
3. Attempt to commit Alice's previously approved service event.

Expected: denied; no Care unit is consumed and no event is committed.

## 7. Cross-provider continuity test

```text
Alice + Provider A diagnostic -> 2 units
transfer -> Bob
Bob + Provider B repair -> 1 unit
```

The owner can see both events; each provider sees only its own scoped history.

## 8. Final-unit concurrency test

With one unit remaining, submit two different service events concurrently at the same expected version. Exactly one may commit.

## 9. Canonical SkillPass runtime boundary

`createRuntimeLedger()` supports the target composition:

```text
CanonicalSkillPassOwnership + PostgresCareStore
```

when the production host injects a canonical `SkillPassOwnershipPort`.

Without that injected binding, `LEDGER_MODE=ckb` remains intentionally fail closed. RPC reachability alone is not treated as ownership integration.
