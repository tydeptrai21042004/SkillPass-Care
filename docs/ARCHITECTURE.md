# Architecture

## Authorization invariant

For entitlement `e`, provider `p` and claimant `u`, service authorization succeeds only if:

```text
live entitlement exists
AND status == ACTIVE
AND not expired
AND current owner == u
AND p is accepted
AND remainingClaims > 0
AND claimant proof is bound to this provider/entitlement/action
```

The first six checks live in the pure domain policy. Proof-of-possession is verified at the API/provider boundary because its mechanism changes from pilot HMAC to wallet signature in CKB mode.

## Pilot request flow

```text
Provider                    API                      Owner
   │                         │                         │
   ├─ create challenge ─────>│                         │
   │<─ signed challenge ─────┤                         │
   │                         │                         │
   │                  challenge token ────────────────>│
   │                         │<──── owner proof ───────┤
   │                         │                         │
   ├─ verify/claim + proof ─>│                         │
   │                         ├─ verify proof           │
   │                         ├─ resolve latest state   │
   │                         ├─ evaluate policy        │
   │<─ decision/evidence ────┤                         │
```

For claims the challenge also binds `serviceEventId`; the ledger binds that event to the request hash for replay-safe retries.

## State and schema versions

- `schemaVersion` — protocol/data-layout version; currently `1`.
- `version` — mutable entitlement revision used by the off-chain pilot for optimistic concurrency.

Real CKB concurrency is ultimately enforced by consuming the exact live input Cell rather than by trusting the JavaScript version counter.

## CKB mapping

```text
ServiceRight.id          stable entitlement/type-script identity
owner                    live Cell lock script (authoritative)
other state              versioned Cell data
transfer                 consume current Cell -> create successor Cell
verification             resolve exactly one canonical live Cell
owner proof              signature by the key controlling current owner lock
claim                    atomic Cell transition or explicitly durable receipt model
```

The V1 Cell-data representation intentionally excludes `owner` so serialized data cannot disagree with the lock script.

## Physical-product boundary

For ordinary second-hand goods, SkillPass can prove who controls the service right, not whether the physical product changed hands. The sale workflow must transfer the entitlement alongside the product. If a product is itself represented by a CKB asset, a future transaction can atomically consume both product and service-right Cells.
