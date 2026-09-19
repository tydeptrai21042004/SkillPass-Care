# API Reference — v0.4

Local base URL: `http://localhost:8787`. Same-origin web/Vercel base URL: `/api`.

All API responses include `x-request-id`. Errors use a stable envelope:

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

## Health / metadata

- `GET /health/live` — function/process liveness.
- `GET /health/ready` — ledger readiness; CKB mode remains `503` until implemented.
- `GET /health` — readiness alias.
- `GET /meta` — non-secret capabilities, schema version and owner-proof mode.

## Scoped reads

`GET /entitlements` and `GET /entitlements/:id` require valid actor credentials and are filtered by actor:

- issuer → rights where `issuerId` matches;
- owner → rights where current `owner` matches;
- provider → rights whose `acceptedProviderIds` contains that provider.

Unauthorized detail access returns `404` to reduce identifier enumeration.

## Issue

`POST /entitlements` with issuer credentials:

```json
{
  "productCommitment": "sha256:...",
  "owner": "alice",
  "serviceClass": "STANDARD_90D",
  "remainingClaims": 3,
  "expiresAt": "2099-12-31T23:59:59.000Z",
  "transferable": true,
  "acceptedProviderIds": ["repair-a", "repair-b"]
}
```

`issuerId` comes only from authenticated credentials. `productHash` is temporarily accepted as a deprecated v0.3 alias for `productCommitment`.

## Transfer

`POST /entitlements/:id/transfer` with current-owner credentials:

```json
{"to":"bob","expectedVersion":1}
```

The transfer source is the authenticated owner. Stale state returns `409 VERSION_CONFLICT`.

## Owner proof flow for provider verification / claim

A provider cannot authorize a bare `{ "claimant": "bob" }` assertion.

### 1. Provider creates a challenge

`POST /entitlements/:id/challenges` with provider credentials.

Verification:

```json
{"claimant":"bob","action":"VERIFY"}
```

Claim:

```json
{"claimant":"bob","action":"CLAIM","serviceEventId":"repair-job-001"}
```

The returned signed challenge binds entitlement, provider, claimant, action, expiry and optional service event.

### 2. Pilot owner produces proof

`POST /owner-proof/sign` with owner credentials:

```json
{"challengeToken":"<token from step 1>"}
```

This produces `HMAC-SHA256-PILOT` proof. It exists only to exercise proof-of-possession semantics before wallet signing is implemented.

### 3a. Verify

`POST /entitlements/:id/verify` with provider credentials:

```json
{
  "claimant":"bob",
  "challengeToken":"...",
  "ownerProof":{
    "scheme":"HMAC-SHA256-PILOT",
    "challengeId":"...",
    "claimant":"bob",
    "value":"..."
  }
}
```

The provider verifier still resolves the latest entitlement state after proof validation. A proof created before a transfer therefore does not make the previous owner eligible.

### 3b. Claim

`POST /entitlements/:id/claim`:

```json
{
  "claimant":"bob",
  "serviceEventId":"repair-job-001",
  "expectedVersion":2,
  "challengeToken":"...",
  "ownerProof":{ "scheme":"HMAC-SHA256-PILOT", "challengeId":"...", "claimant":"bob", "value":"..." }
}
```

`serviceEventId` is idempotent per provider. Retrying the exact same request returns the original result instead of consuming another claim. Reusing the same event ID for a different bound request returns `409 IDEMPOTENCY_CONFLICT`.

## Status

`PATCH /entitlements/:id/status` with issuer credentials:

```json
{"status":"SUSPENDED","expectedVersion":2}
```

Revocation is irreversible in the current transition model.

## Public demo

When `ENABLE_DEMO_ENDPOINTS=true`:

```text
GET  /demo/state
POST /demo/reset
POST /demo/entitlements/:id/transfer
POST /demo/entitlements/:id/verify
POST /demo/entitlements/:id/claim
```

These routes intentionally simulate named actors and are not an ownership-security boundary.
