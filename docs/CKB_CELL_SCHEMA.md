# CKB / SkillPass Data Boundary

The target architecture does **not** put all mutable SkillPass Care business state into the portable ownership Cell.

## Target split

```text
SkillPass / CKB portable state
  capability identity
  issuer
  product/subject commitment
  Care policy commitment
  expiry / transferable flags
  current owner from live Cell lock

SkillPass Care application state
  remaining coverage
  service-event history
  accepted-provider workflow metadata
  issuer status reason
  private service details
```

This separation lets SkillPass remain a reusable portable-right protocol while Care remains a rich application.

## Legacy prototype codec in this repository

`packages/ckb-adapter/src/cell-schema.ts` still contains `CkbServiceRightDataV1`. It exists to preserve and test the earlier prototype semantics while the canonical cross-repository SkillPass Capability V2 mapping is finalized. **It is not the proposed final on-chain schema.**

It intentionally excludes `owner`; even in the legacy prototype, owner must come from the live Cell lock.

Before a real CKB deployment, replace the prototype JSON encoding with the canonical SkillPass capability/Molecule representation and store only the fields needed by the portable ownership layer. Care's mutable service-event history and quota accounting belong in a durable Care store unless a later protocol milestone explicitly proves a different design is necessary.

## Required live-state invariant

For one portable right identity `E`, resolution must produce at most one canonical live Cell. Transfer consumes the old Cell and creates the successor owned by the recipient. A provider must fail closed on duplicate/ambiguous live state or inability to establish finality.
