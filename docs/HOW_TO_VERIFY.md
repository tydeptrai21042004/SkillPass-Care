# How to Verify v0.4

## Dependency-free repository preflight

```bash
npm run preflight
```

This confirms the single Vercel entrypoint, required hardening files and workspace version consistency.

## Full checks

```bash
npm install --no-audit --no-fund
npm run check
```

## Public demo lifecycle

Run `npm run dev`, use a cookie jar, and exercise:

```text
GET /demo/state
Alice at repair-a -> ALLOW
transfer Alice -> Bob
Alice at repair-a -> WRONG_OWNER
Bob at repair-b -> ALLOW
```

The public demo is intentionally actor-simulated and does not test proof-of-possession.

## Authenticated owner-proof flow

Use credentials from `.env`.

1. Provider A creates a verify challenge:

```bash
curl -s -X POST http://localhost:8787/entitlements/ENT_ID/challenges \
  -H 'content-type: application/json' \
  -H 'x-provider-id: repair-a' -H 'x-provider-key: PROVIDER_SECRET' \
  -d '{"claimant":"alice","action":"VERIFY"}'
```

2. Alice signs the returned `token` using the pilot signing endpoint:

```bash
curl -s -X POST http://localhost:8787/owner-proof/sign \
  -H 'content-type: application/json' \
  -H 'x-owner-id: alice' -H 'x-owner-key: ALICE_SECRET' \
  -d '{"challengeToken":"TOKEN"}'
```

3. Provider submits claimant + token + proof to `/entitlements/ENT_ID/verify`.

Expected evidence includes `requestHash`, `stateRef`, expiry and `HMAC-SHA256-PILOT` signature.

## Claim replay check

Create a `CLAIM` challenge with a stable `serviceEventId`, sign it, then submit the same claim twice. `remainingClaims` must decrement only once and both exact retries must return the same committed result. A different claimant/request reusing the same provider event ID must return `409 IDEMPOTENCY_CONFLICT`.

## Scoped read check

- no credentials → `401`;
- owner → only current-owner rights;
- provider → only rights accepting that provider;
- issuer → only rights issued by that issuer.

A provider requesting an unrelated entitlement detail should receive `404`.

## Product commitment helper

```bash
npm run product:commitment -- seller-namespace serial-or-internal-id
```

Store the returned salt off-chain if future recomputation is needed. Only the `sha256:<64 hex>` commitment belongs in the entitlement.

## CKB boundary check

Set `LEDGER_MODE=ckb`. `/health/ready` should remain `503`, and state operations should fail with `NOT_IMPLEMENTED`. This is expected until the real live-Cell protocol is deployed.
