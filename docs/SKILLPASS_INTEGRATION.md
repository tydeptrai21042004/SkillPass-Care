# SkillPass Integration Boundary

SkillPass Care is a **reference product built on SkillPass**, not a second generic SkillPass protocol.

## Responsibilities

| SkillPass responsibility | SkillPass Care responsibility |
|---|---|
| portable capability identity | product / coverage presentation |
| authoritative current owner | Care plan and coverage quota |
| Alice -> Bob ownership transfer | service-event history |
| live-state resolution | provider-service workflow |
| owner authorization | issuer suspend/resume/revoke |
| request-bound authorization evidence | privacy-scoped application data |
| generic provider conformance | second-hand product workflow |

The machine-readable compatibility contract is `skillpass.protocol.json`. It pins Capability V2 and the SkillPass package versions expected by the reference integration.

## Target mapping

| Care concept | SkillPass field / property |
|---|---|
| Care entitlement identity | `capabilityId` |
| issuer | `issuerId` |
| Care program | `serviceId` |
| product commitment | subject / `subjectId` |
| Care plan commitment | `policyHash` |
| maximum expiry | capability expiry |
| transferable | capability flag |
| current owner | live Cell lock / resolved SkillPass owner |

Care keeps the mutable business state:

```text
remaining coverage
service-event history
provider references
issuer suspension/revocation state
display metadata
pilot analytics
```

Care must never persist an authoritative owner override.

## Runtime composition

`apps/api/src/runtime.ts` exposes `createRuntimeLedger()` / `createRuntimeApp()` with a production injection point for `SkillPassOwnershipPort`.

The intended production composition is:

```text
CanonicalSkillPassOwnership
          +
PostgresCareStore
          |
          v
SplitServiceRightLedger
```

When `LEDGER_MODE=ckb` but no canonical binding is deliberately injected, the default runtime uses the fail-closed `CkbLedgerAdapter`; it does **not** silently fall back to memory ownership.

This means the repository now has the correct composition boundary without pretending that the cross-repository Testnet binding is already deployed.

## Freshness rule

A provider must never commit a Care service event solely because an earlier owner proof was valid.

The Care store checks the SkillPass authorization `stateRef` before applying the transition and again immediately before commit. If the referenced ownership Cell/state has been consumed or superseded, the service event fails closed and the Care mutation rolls back.

## Funding acceptance flow

The cross-repository milestone is complete only when this sequence is reproducible with retained Testnet evidence:

```text
1. SkillPass right issued to Alice.
2. Provider A independently authorizes Alice.
3. Care records one Alice service event: 3 -> 2 units.
4. SkillPass right transfers Alice -> Bob.
5. Alice becomes ineligible.
6. Provider B independently authorizes Bob.
7. Care records one Bob service event: 2 -> 1 unit.
8. Care history contains both provider events while current ownership is Bob.
```
