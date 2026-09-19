# Provider Integration

A provider should be able to verify a service right without reading the issuer's customer database.

## Required production behavior

1. Provider identity is locally configured/authenticated.
2. Provider requests an owner challenge bound to itself and the entitlement.
3. Current owner signs the canonical challenge (pilot: HMAC; target: wallet key).
4. Provider verifies proof and resolves the latest entitlement state.
5. Provider evaluates status, expiry, owner, provider policy and remaining claims.
6. Provider records signed authorization evidence.
7. A service consumption uses a stable `serviceEventId`; retries reuse the same ID.
8. Any inability to resolve authoritative state fails closed.

## Provider SDK

`ProviderVerifier` intentionally owns only the state-verification/evidence layer. The HTTP API currently performs pilot challenge verification before invoking it. In the CKB target, a provider deployment should combine the SDK with wallet-signature verification and canonical live-Cell resolution.

```ts
const verifier = new ProviderVerifier({
  providerId: "repair-shop-a",
  ledger,
  evidenceSigner
});

const evidence = await verifier.verify({
  entitlementId: "ent-123",
  claimant: "ckt1...owner",
  challengeId: "...",
  requestHash: "sha256:..."
});
```

Do not treat a bare claimant string as identity proof.
