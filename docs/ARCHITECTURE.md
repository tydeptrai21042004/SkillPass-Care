# Architecture

## Core invariant

For provider `p`, claimant `u` and entitlement `e`, authorization succeeds only when:

```text
entitlement exists
AND status == ACTIVE
AND not expired
AND current owner == u
AND p is accepted by entitlement policy
AND remainingClaims > 0
```

After a transfer, all providers that resolve current state must reject the previous owner and accept the new owner when all other policy conditions hold.

## Trust boundaries

```text
Issuer backend ── authenticated issuer identity ──┐
                                                  │
Owner/client ─── authenticated pilot owner ───────┼── API ── Ledger
                                                  │
Provider A ───── authenticated provider A ─────────┤
Provider B ───── authenticated provider B ─────────┘
```

The browser demonstration is separate and uses only `/demo/*` routes. Those routes intentionally simulate actors and are not a security boundary.

## Domain model

A `ServiceRight` contains a stable pilot ID, issuer, privacy-preserving product commitment, current owner principal, service class, remaining claim count, expiry, transfer flag, accepted providers, status and monotonically increasing version.

In the memory pilot, `owner` is stored directly. In a CKB implementation it must be **derived from the lock script of the canonical live Cell** and should not be duplicated as authoritative Cell data.

## Optimistic mutation rule

State-changing operations may provide `expectedVersion`:

```text
client observed version N
        ↓
mutation requires version N
        ↓
ledger is still N → commit N+1
ledger already changed → 409 conflict
```

This protects the pilot from silent lost updates. Real CKB atomicity ultimately comes from Cell consumption, not from a JavaScript version field.

## Provider independence

`packages/provider-sdk` takes a fixed provider identity plus a ledger resolver. It resolves the entitlement before each decision and returns evidence containing the provider, claimant, version and verification time.

For a stronger decentralization demonstration, deploy Provider A and Provider B as separate backend processes that each resolve the same CKB state rather than routing both through one central API.

## CKB production mapping

```text
ServiceRight.id      -> stable type-script / entitlement identity
owner                -> current live Cell lock script
state/policy         -> versioned Cell data and/or committed policy hash
issue                -> wallet/issuer signed creation transaction
transfer             -> consume current Cell + create successor owned by recipient
get                   -> resolve exactly one canonical live Cell
claim                 -> explicitly defined atomic on-chain transition OR durable off-chain receipt model
```

The current `CkbLedgerAdapter` deliberately does not invent these operations. It exposes RPC health for diagnostics and returns not-ready until the protocol details are actually implemented.
