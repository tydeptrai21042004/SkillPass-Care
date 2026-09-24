# API Reference — v0.5

Local base URL: `http://localhost:8787`. Same-origin web/Vercel base URL: `/api`.

All responses include `x-request-id`. Errors use a stable envelope:

```json
{"error":{"code":"VERSION_CONFLICT","message":"...","requestId":"..."}}
```

## Actor credentials

```text
Issuer:   x-issuer-id / x-issuer-key
Provider: x-provider-id / x-provider-key
Owner:    x-owner-id / x-owner-key
```

These shared secrets are a controlled-pilot mechanism, not the target CKB identity model.

## Metadata and plans

- `GET /health/live`
- `GET /health/ready`
- `GET /meta`
- `GET /care-plans` — reference Care plans and allowed service types.

## Scoped entitlement reads

`GET /entitlements` and `GET /entitlements/:id` require actor credentials.

- issuer -> rights issued by that issuer;
- owner -> rights currently owned by that owner;
- provider -> rights that accept that provider.

Unauthorized detail reads return `404`.

## Issue / attach Care coverage

`POST /entitlements` with issuer credentials. In demo mode, ownership may be created by the local simulator. In canonical SkillPass mode, supply `entitlementId` for an already-issued SkillPass Capability; Care resolves that identity and creates only the application state.


```json
{
  "entitlementId": "optional-existing-skillpass-capability-id",
  "productCommitment": "sha256:...",
  "owner": "alice",
  "serviceClass": "STANDARD_90D",
  "remainingClaims": 3,
  "expiresAt": "2099-12-31T23:59:59.000Z",
  "transferable": true,
  "acceptedProviderIds": ["repair-a", "repair-b"]
}
```

`issuerId` comes from authenticated credentials. In canonical mode, the supplied owner and issuer must agree with the resolved SkillPass entitlement. `productHash` remains a deprecated compatibility alias.

## Transfer

`POST /entitlements/:id/transfer` with current-owner credentials:

```json
{"to":"bob","expectedVersion":2}
```

Coverage quota/history are not reset by transfer.

## Owner proof flow

### Verify challenge

`POST /entitlements/:id/challenges`:

```json
{"claimant":"bob","action":"VERIFY"}
```

### Service challenge

A service event binds the exact service and units the owner is approving:

```json
{
  "claimant":"bob",
  "action":"CLAIM",
  "serviceEventId":"repair-bob-001",
  "serviceType":"REPAIR",
  "unitsConsumed":1
}
```

The signed challenge binds entitlement, provider, claimant, action, event ID, service type, units and expiry. A provider cannot obtain approval for one diagnostic unit and later submit a two-unit replacement request with the same proof.

### Pilot owner signing

`POST /owner-proof/sign` with owner credentials:

```json
{"challengeToken":"..."}
```

This produces `HMAC-SHA256-PILOT` proof. The target integration replaces it with wallet signing by the current SkillPass owner.

## Preferred service-event API

`POST /entitlements/:id/service-events` with provider credentials:

```json
{
  "claimant":"bob",
  "serviceEventId":"repair-bob-001",
  "serviceType":"REPAIR",
  "unitsConsumed":1,
  "expectedVersion":3,
  "challengeToken":"...",
  "ownerProof":{
    "scheme":"HMAC-SHA256-PILOT",
    "challengeId":"...",
    "claimant":"bob",
    "value":"..."
  }
}
```

Response:

```json
{
  "entitlement": { "remainingClaims": 1, "version": 4 },
  "event": {
    "eventVersion": 2,
    "eventId": "repair-bob-001",
    "providerId": "repair-b",
    "claimant": "bob",
    "serviceType": "REPAIR",
    "unitsConsumed": 1,
    "entitlementVersionBefore": 3,
    "entitlementVersionAfter": 4,
    "remainingClaimsAfter": 1
  }
}
```

`providerId + serviceEventId` is idempotent. Exact retries return the existing committed result. Reusing the ID for a changed claimant, request hash, service type or unit count returns `409 IDEMPOTENCY_CONFLICT`.

`POST /entitlements/:id/claim` remains as a deprecated compatibility route and emits a `Deprecation: true` response header.

## Service history

`GET /entitlements/:id/service-events`:

- current owner and issuer may read the transferable event history;
- a provider sees only that provider's events.

Detailed private technician notes should not be placed in the transferable event record.

## Status

`PATCH /entitlements/:id/status` with issuer credentials:

```json
{"status":"SUSPENDED","expectedVersion":4}
```

Revocation remains irreversible.

## Public demo

When `ENABLE_DEMO_ENDPOINTS=true`:

```text
GET  /demo/state
POST /demo/reset
POST /demo/entitlements/:id/transfer
POST /demo/entitlements/:id/verify
POST /demo/entitlements/:id/claim
```

The product demo now shows Alice consuming a diagnostic before transfer and Bob consuming a repair after transfer. These routes are still actor-simulated and not an ownership-security boundary.
