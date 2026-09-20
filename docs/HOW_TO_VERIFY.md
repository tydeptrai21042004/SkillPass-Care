# How to Verify v0.5

## 1. Dependency-free repository checks

```bash
npm run verify:care
```

This verifies repository structure, package versioning, single Vercel entrypoint, the Care-specific namespace, service-event surface, and the documented SkillPass/Care boundary.

## 2. Full checks

After generating/committing a lockfile in a networked environment:

```bash
npm ci
npm run check
```

Without a lockfile during development:

```bash
npm install --no-audit --no-fund
npm run check
```

## 3. Flagship public demo

Run `npm run dev` and execute this exact sequence in the Product view:

```text
Reset
Provider A verifies Alice
Alice diagnostic: 3 -> 2
transfer Alice -> Bob
Provider A rejects Alice
Provider B verifies Bob
Bob repair: 2 -> 1
```

Expected product property: ownership changes, but remaining Care coverage is not reset.

## 4. Authenticated typed service event

Create a CLAIM challenge containing:

```json
{
  "claimant":"alice",
  "action":"CLAIM",
  "serviceEventId":"diag-alice-001",
  "serviceType":"DIAGNOSTIC",
  "unitsConsumed":1
}
```

Sign the returned token as Alice, then submit the same fields to:

```text
POST /entitlements/:id/service-events
```

Expected response contains both the updated entitlement and a `ServiceEventRecord`.

## 5. Request-tampering test

Request owner approval for:

```text
DIAGNOSTIC / 1 unit
```

Then submit the same proof as:

```text
REPAIR / 1 unit
```

Expected: `401 CHALLENGE_INVALID`.

Repeat by changing `unitsConsumed`; it must also fail.

## 6. Transfer-race test

1. Create a service challenge/proof for Alice.
2. Transfer the right Alice -> Bob.
3. Attempt to commit Alice's previously approved service event.

Expected: service commit denied because Alice is no longer the current owner.

## 7. Cross-provider continuity test

Authenticated API test:

```text
Alice + Provider A diagnostic -> 2 units
transfer -> Bob
Bob + Provider B repair -> 1 unit
```

Then read history as Bob. It must contain both provider events. Read the same history as Provider A: only Provider A's event should be visible.

## 8. Final-unit concurrency test

With one unit remaining, submit two different service events concurrently at the same expected version. Exactly one may commit.

## 9. CKB honesty boundary

Set `LEDGER_MODE=ckb`.

- RPC probe may succeed.
- readiness remains false.
- state operations remain fail-closed.

This is expected until the canonical SkillPass testnet bridge is connected.
