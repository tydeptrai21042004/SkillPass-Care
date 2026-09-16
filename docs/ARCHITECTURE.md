# Architecture

## Goal

SkillPass Care separates four concerns:

```text
Product owner / wallet
        │
        ▼
Service entitlement state
        │
        ├──────────────► Provider A verifier
        ├──────────────► Provider B verifier
        └──────────────► Provider C verifier
```

Providers do not need a shared entitlement database. Each provider asks the same ledger adapter for the current live entitlement state and independently applies its acceptance policy.

## Domain model

A `ServiceRight` contains:

- `id`: stable entitlement identifier.
- `issuerId`: seller/issuer identity.
- `productHash`: privacy-preserving binding to the covered product.
- `owner`: current wallet/principal.
- `serviceClass`: human/business label such as `STANDARD_90D`.
- `remainingClaims`: remaining service events.
- `expiresAt`: expiration timestamp.
- `transferable`: whether owner transfer is allowed.
- `acceptedProviderIds`: explicit providers recognized by this pilot plan.
- `version`: monotonically increasing revision number.

The pilot intentionally keeps personally identifying customer information off ledger.

## Authorization invariant

For a provider `p`, user `u` and entitlement `e`, authorization succeeds only when:

```text
entitlement exists
AND entitlement is active
AND entitlement.owner == u
AND p is accepted by entitlement policy
AND remainingClaims > 0
```

A transfer creates a new entitlement state/version. Providers always resolve the latest live state through the ledger adapter.

## Package boundaries

### `packages/core`
Pure TypeScript domain logic. It knows nothing about Express, React, CKB RPCs or databases.

### `packages/ckb-adapter`
Defines the storage/ledger interface. The in-memory adapter is executable. The CKB adapter is a documented production boundary.

### `packages/provider-sdk`
What an independent provider would integrate. A provider needs a ledger adapter plus its own provider ID; it does not need the issuer's customer database.

### `apps/api`
Coordinates application use-cases. The API is intentionally thin so business rules remain testable in `core`.

### `apps/web`
Pilot UI for demos/interviews. It should remain understandable by a non-blockchain user.

## Production evolution

The intended production/testnet mapping is:

```text
ServiceRight.id          -> stable type-script/entitlement identifier
ServiceRight.owner       -> lock-script owner of current live Cell
ServiceRight.version     -> sequence / creation order / immutable cell transition
issue()                  -> build + sign + send creation transaction
transfer()               -> consume current Cell, create new owner Cell
findById()               -> locate canonical live Cell via indexer/RPC
claim()                  -> policy-dependent state transition or off-chain audit record
```

No caller should depend on the in-memory representation itself.
