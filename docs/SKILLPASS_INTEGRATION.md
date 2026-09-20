# SkillPass Integration Boundary

SkillPass Care is a **reference product built on SkillPass**, not a second generic SkillPass protocol.

## Responsibilities

| SkillPass responsibility | SkillPass Care responsibility |
|---|---|
| portable capability identity | product / coverage presentation |
| authoritative current owner | Care plan and coverage quota |
| Alice -> Bob ownership transfer | service-event history |
| live-state resolution | provider-service workflow |
| owner proof | issuer suspend/resume/revoke |
| request-bound authorization evidence | privacy-scoped application data |
| generic provider conformance | second-hand product workflow |

## Target mapping

The target SkillPass Capability V2 integration should map Care concepts approximately as follows:

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
provider notes / references
issuer status reason
display metadata
pilot analytics
```

## Freshness rule

A provider must never commit a Care service event solely because an earlier owner proof was valid. Immediately before committing the event, the integration must verify that the SkillPass state reference used by the proof is still current. If the referenced ownership Cell/state has been consumed or superseded, the service event fails closed and the provider must re-authorize the current owner.

## Funding acceptance flow

The cross-repository milestone is complete only when this sequence is reproducible:

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

This is the flagship proof that Care adds real application value instead of merely mirroring the ownership primitive.
