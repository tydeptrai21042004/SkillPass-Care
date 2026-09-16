# Security Notes

## Threats considered in the pilot

### Stale-owner access
A provider must resolve the latest entitlement state before each protected service action. Cached owner state must not be treated as authoritative.

### Client tampering
The client cannot declare itself the owner. The provider resolves ownership from the ledger adapter.

### Provider confusion
Provider identity is explicit. An entitlement can limit which providers are accepted.

### Replay
A future production adapter should bind signed request intents to a nonce/idempotency key, request hash, short expiry and current entitlement version.

### Double claim
The memory adapter makes claim mutation atomic inside one process. A production design must make concurrent claim behavior deterministic and auditable.

### Privacy
The ledger object stores a product hash rather than raw serial number or customer PII.

## Production requirements before mainnet

- Use CCC for wallet/transaction construction.
- Define canonical issuer trust.
- Sign provider manifests.
- Bind idempotency keys to request hashes.
- Define confirmation/reorg policy.
- Add durable audit evidence.
- Fail closed when live-state verification is unavailable.
- Run dependency and secret scanning.
- Obtain an external security review before handling valuable rights.
