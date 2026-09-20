# Security Notes

## Implemented controls

- Issuer, provider and transfer-source identity are derived from authenticated credentials, not request JSON.
- Provider verification/claim requires owner proof bound to entitlement, provider, claimant, action and expiration.
- Claim challenges additionally bind `serviceEventId`, `serviceType`, and `unitsConsumed`.
- The latest entitlement is resolved after owner proof validation; stale pre-transfer proof cannot restore old-owner eligibility.
- Mutations require `expectedVersion` in the off-chain pilot.
- Service retries are idempotent and reject event-ID/request-hash/service-detail mismatch.
- Typed service events record before/after entitlement versions and remaining coverage.
- Provider service-history reads are scoped to that provider; current owner/issuer can inspect transferable history.
- List/detail reads are actor-scoped.
- Revocation is irreversible.
- Demo state is signed, HttpOnly and non-authoritative.
- Production demo mode requires a strong `DEMO_SESSION_SECRET`.
- Production pilot mode requires complete actor credentials, a strong `OWNER_PROOF_CHALLENGE_SECRET`, and minimum credential-secret length.
- API responses use request IDs, `no-store`, strict JSON size/shape validation and defensive headers.
- CKB state operations fail closed rather than silently falling back to memory.

## Pilot cryptography limitation

`HMAC-SHA256-PILOT` owner proof and provider evidence are intentionally named as pilot mechanisms. The server shares the underlying secrets, so they are not equivalent to independently verifiable asymmetric signatures.

The production target is:

```text
owner proof      = wallet signature by current Cell-lock controller
provider evidence = asymmetric provider signature / key rotation metadata
```

## Remaining high-priority risks

1. Memory state is process-local and not durable under horizontal/serverless scaling.
2. Challenge replay for read-only verification is possible within the short TTL; this is acceptable for a non-mutating decision. Claims are protected by service-event idempotency.
3. Static shared secrets need rotation and eventually replacement by stronger provider/issuer authentication.
4. CKB canonical live-Cell uniqueness, confirmation depth and reorg handling are not yet implemented.
5. Physical product possession is outside the cryptographic trust boundary unless the product itself is represented on-chain.
