# Threat Model

| Threat | Current mitigation | Residual limitation |
|---|---|---|
| Provider submits `claimant=bob` without Bob | Bound owner challenge + proof required | Pilot HMAC is server-known; replace with wallet signature |
| Proof reused at another provider | Challenge binds provider ID | Read-only verify can replay at same provider until TTL |
| Proof reused for another entitlement/action | Challenge binds entitlement + action | None within signed-token assumptions |
| Claim HTTP retry consumes twice | `providerId + serviceEventId` idempotency + request-hash binding | In-memory idempotency is not cross-process durable |
| Two stale mutations race | required `expectedVersion` | Memory implementation is single-process only |
| Previous owner uses old proof after transfer | latest state resolved at decision time | Requires trustworthy live-state backend |
| Actor reads unrelated rights | actor-scoped list/detail authorization | Metadata visible through any intentionally returned right |
| Demo cookie forged | HMAC + production secret requirement | Demo remains non-authoritative by design |
| API secrets leaked | no secret echoed; timing-safe comparison | static secrets still need rotation/secret manager |
| CKB unavailable/undefined protocol | fail closed | CKB operations unavailable until implemented |
| Cell data claims a different owner | V1 Cell data excludes owner | final lock->principal mapping still to implement |
| Physical product not actually sold | not claimed as protocol guarantee | sale workflow/off-chain verification required |

## Security invariant for CKB target

For entitlement identity `E`:

```text
number of canonical live entitlement Cells(E) <= 1
```

and authorization owner must be derived from that Cell's lock script. A provider must never accept owner identity from Cell data or an application database as the authoritative source.
