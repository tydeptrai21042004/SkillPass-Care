# Provider Integration

A service provider should be able to integrate SkillPass without operating the issuer's database.

## Minimal integration

```ts
import { ProviderVerifier } from "@skillpass/provider-sdk";

const verifier = new ProviderVerifier({
  providerId: "repair-shop-a",
  ledger
});

const decision = await verifier.verify({
  entitlementId: "ent-123",
  claimant: "ckt1...alice"
});

if (!decision.allowed) {
  // Deny service and display decision.reason.
}
```

## Provider responsibilities

A provider should:

1. Keep its own provider identity/configuration.
2. Verify the latest entitlement state through the ledger adapter.
3. Fail closed when live state cannot be verified.
4. Record an audit event for accepted/rejected service attempts.
5. Never trust owner information supplied only by the client.

## What is intentionally *not* shared

- customer entitlement database,
- session cookies,
- provider internal user table,
- provider private signing keys,
- repair/service history beyond the records required by the pilot.

## Production note

For real CKB integration, the provider should resolve the canonical live Cell through a trusted RPC/indexer strategy and verify ownership against the Cell's lock script. A production deployment must define confirmation and reorganization handling explicitly.
