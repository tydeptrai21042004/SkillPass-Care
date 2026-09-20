# Architecture

SkillPass Care deliberately has **two state layers**. This is the central design rule for the funding pilot.

```text
CKB / SkillPass ownership layer
  ├─ capability identity
  ├─ current owner / live state reference
  ├─ transfer
  ├─ owner proof
  └─ provider authorization evidence
          │
          ▼
SkillPass Care application layer
  ├─ product commitment
  ├─ Care plan / service class
  ├─ coverage units remaining
  ├─ service-event history
  ├─ accepted-provider policy
  ├─ suspend / resume / revoke
  └─ issuer / owner / provider workflow
```

SkillPass answers **who controls the portable right**. Care answers **what coverage remains and what service has happened**.

## Composite authorization invariant

For entitlement `e`, provider `p`, claimant `u`, requested service `s`, and units `q`, Care authorizes service only if:

```text
latest entitlement exists
AND status == ACTIVE
AND not expired
AND current owner == u
AND p is accepted
AND remaining coverage >= q
AND Care plan allows s
AND owner proof binds e + p + u + s + q + serviceEventId
```

In the memory pilot the owner is stored inside the local `ServiceRight`. In the target SkillPass integration the owner MUST come from the authoritative live SkillPass/CKB state. Care must never promote a cached application owner field above the chain-derived owner.

## Service continuity invariant

Ownership and coverage are independent transitions.

Ownership transfer:

```text
owner: Alice -> Bob
remaining coverage: unchanged
service history: unchanged
```

Service consumption:

```text
owner: unchanged
remaining coverage: decreases by the authorized units
service history: append one ServiceEventRecord
```

This is what enables the flagship flow:

```text
Alice owns 3 units
  -> Provider A diagnostic
Alice owns 2 units
  -> transfer to Bob
Bob owns 2 units
  -> Provider B repair
Bob owns 1 unit
```

## Provider request flow

```text
Provider                    API                      Owner
   │                         │                         │
   ├─ create challenge ─────>│                         │
   │<─ signed challenge ─────┤                         │
   │                         │                         │
   │                  challenge token ────────────────>│
   │                         │<──── owner proof ───────┤
   │                         │                         │
   ├─ service event + proof >│                         │
   │                         ├─ verify proof           │
   │                         ├─ resolve latest owner   │
   │                         ├─ verify Care policy     │
   │                         ├─ atomically consume q   │
   │                         ├─ append service event   │
   │<─ state + event ────────┤                         │
```

For a service event, the owner challenge binds:

```text
entitlementId
providerId
claimant
serviceEventId
serviceType
unitsConsumed
expiry
```

Changing the requested service or quantity after owner approval invalidates the challenge.

## Idempotency and concurrency

`providerId + serviceEventId` is the idempotency key. The key is also bound to the canonical request hash. Exact retries return the original committed result; reusing the same event identifier for a different request returns `409 IDEMPOTENCY_CONFLICT`.

Every mutable pilot operation also uses `expectedVersion`. This prevents two providers from independently consuming the same final coverage unit in the in-memory model. In a durable Care store this becomes a transaction/compare-and-swap boundary. In the SkillPass ownership layer, transfer freshness ultimately comes from consuming the exact live CKB Cell.

## Privacy boundary

Do not put customer PII or detailed repair notes into the portable SkillPass ownership object. The public/portable layer should carry only what is needed to identify and verify the service right, such as product and policy commitments. Care-specific service details belong in the Care data layer and should be actor-scoped.

## Physical-product boundary

For an ordinary physical product, neither Care nor SkillPass independently proves that the physical item changed hands. The pilot coordinates the service-right transfer with the product sale. A future CKB-native product asset may support atomic product + service-right transfer, but that is not required for this funding scope.
