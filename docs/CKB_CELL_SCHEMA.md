# CKB ServiceRight Cell — V1 Design Boundary

`packages/ckb-adapter/src/cell-schema.ts` defines the prototype V1 data payload.

## Authoritative ownership

`owner` is **not serialized in Cell data**. In CKB mode the authoritative owner is the current live Cell's lock script.

## V1 payload

```text
schemaVersion
id
issuerId
productCommitment
serviceClass
remainingClaims
expiresAt
transferable
acceptedProviderIds
status
version
createdAt
updatedAt
```

The current deterministic JSON byte encoding exists to freeze semantics and support tests. Decoding is strict: unknown fields are rejected, `productCommitment` must be canonical lowercase `sha256:<64 hex>`, timestamps must be canonical UTC ISO strings, and `acceptedProviderIds` must be unique and lexicographically sorted. It is not a claim that JSON is the final on-chain serialization. Before deployment, replace it with a reviewed Molecule schema and bind the type script to the stable entitlement identity.

## Required live-Cell invariant

For one entitlement identity `E`, a correct resolver must find at most one canonical live Cell. `selectUniqueLiveCell()` makes duplicate live Cells an explicit fail-closed `LEDGER_UNAVAILABLE` condition rather than choosing one arbitrarily. Transfer consumes the old Cell and creates exactly one successor locked to the new owner.

## Still intentionally unimplemented

- deployed type-script code hash/args;
- canonical indexer query;
- lock-script-to-principal mapping;
- transaction construction/signing;
- confirmation/reorg policy;
- claim transition/receipt semantics.

Until these exist, `CkbLedgerAdapter` remains fail closed.
