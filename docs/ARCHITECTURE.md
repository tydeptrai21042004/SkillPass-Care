# Architecture

## Core authorization invariant

For provider `p`, claimant `u` and entitlement `e`, authorization succeeds only when:

```text
entitlement exists
AND status == ACTIVE
AND not expired
AND current owner == u
AND p is accepted by entitlement policy
AND remainingClaims > 0
```

After a transfer, providers resolving the same current state must reject the previous holder and may accept the new holder when all other policy conditions hold.

## Deployment layers

```text
Browser
  │
  ├── Product/reviewer UI (Vite static output)
  │
  └── /api/*
        │
        ├── /demo/*  → signed browser-session state (public showcase)
        │
        └── authenticated API
              │
              └── ServiceRightLedger
                    ├── InMemoryLedger (local/single-process pilot)
                    └── CkbLedgerAdapter (currently fail-closed)
```

The public demo does not use process memory for lifecycle state. That makes it deterministic across serverless function instances while keeping it clearly non-authoritative.

## Shared transition logic

`packages/core/src/transitions.ts` owns transfer, claim, and status transition rules. Both the memory ledger and public demo route layer call these functions, reducing semantic drift between the showcase and API behavior.

## Optimistic mutation rule

Authenticated HTTP mutations require `expectedVersion`:

```text
client observed version N
        ↓
mutation requires version N
        ↓
state is still N → commit N+1
state already changed → 409 VERSION_CONFLICT
```

Real CKB atomicity ultimately comes from Cell consumption, not from this JavaScript version field.

## Trust boundaries

```text
Issuer backend ── authenticated issuer identity ──┐
                                                  │
Owner/client ─── authenticated pilot owner ───────┼── API ── Ledger
                                                  │
Provider A ───── authenticated provider A ─────────┤
Provider B ───── authenticated provider B ─────────┘
```

The `/demo/*` routes are a separate non-authoritative boundary. They intentionally simulate actors and store state in a signed browser session.

## CKB production mapping

```text
ServiceRight.id      -> stable type-script / entitlement identity
owner                -> current live Cell lock script
state/policy         -> versioned Cell data and/or committed policy hash
issue                -> wallet/issuer signed creation transaction
transfer             -> consume current Cell + create successor owned by recipient
get                   -> resolve exactly one canonical live Cell
claim                 -> explicitly defined atomic on-chain transition OR durable receipt model
```

The current `CkbLedgerAdapter` does not invent these operations. It reports RPC diagnostics and remains not-ready until the protocol implementation exists.
