# API Reference

Local API base URL: `http://localhost:8787`.

Browser/Vercel base URL: `/api` on the same deployment origin.

All API responses include `x-request-id`. Errors use:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "stale entitlement version: expected 1, current 2",
    "requestId": "..."
  }
}
```

## Health and metadata

### `GET /health/live`
Process/function liveness only.

### `GET /health/ready`
Returns ledger readiness. Memory mode is ready for demo/local pilot behavior. CKB mode deliberately returns `503` until the real SkillPass Cell adapter exists.

### `GET /health`
Alias for readiness.

### `GET /meta`
Returns non-secret deployment capabilities such as API version, demo enablement, ledger mode and CKB implementation status.

## Credential-protected reads

`GET /entitlements` and `GET /entitlements/:id` require any valid configured issuer, provider or owner credential. They are not public discovery endpoints.

Supported actor headers are:

```text
x-issuer-id / x-issuer-key
x-provider-id / x-provider-key
x-owner-id / x-owner-key
```

## Authenticated issuer routes

Headers:

```text
x-issuer-id: seller-demo
x-issuer-key: <server-configured secret>
```

### `POST /entitlements`

```json
{
  "productHash": "sha256:device-001:salted-commitment",
  "owner": "alice",
  "serviceClass": "STANDARD_90D",
  "remainingClaims": 3,
  "expiresAt": "2099-12-31T23:59:59.000Z",
  "transferable": true,
  "acceptedProviderIds": ["repair-a", "repair-b"]
}
```

`issuerId` comes from authenticated credentials and cannot be selected in JSON.

### `PATCH /entitlements/:id/status`

```json
{
  "status": "SUSPENDED",
  "expectedVersion": 2
}
```

`expectedVersion` is required. Allowed status values are `ACTIVE`, `SUSPENDED`, and `REVOKED`. Revocation is irreversible in the memory pilot.

## Authenticated owner transfer

Headers:

```text
x-owner-id: alice
x-owner-key: <server-configured secret>
```

### `POST /entitlements/:id/transfer`

```json
{
  "to": "bob",
  "expectedVersion": 1
}
```

The transfer source comes from the authenticated owner identity, not a caller-supplied `from` field. `expectedVersion` is required and a stale version returns `409 VERSION_CONFLICT`.

## Authenticated provider routes

Headers:

```text
x-provider-id: repair-a
x-provider-key: <server-configured secret>
```

### `POST /entitlements/:id/verify`

```json
{
  "claimant": "bob"
}
```

The response includes provider ID, claimant, entitlement version, verification result/reason and timestamp.

### `POST /entitlements/:id/claim`

```json
{
  "claimant": "bob",
  "expectedVersion": 2
}
```

`expectedVersion` is required.

## Public demo routes

Available only when `ENABLE_DEMO_ENDPOINTS=true`:

```text
GET  /demo/state
POST /demo/reset
POST /demo/entitlements/:id/transfer
POST /demo/entitlements/:id/verify
POST /demo/entitlements/:id/claim
```

The demo uses a signed, HttpOnly browser-session cookie instead of process memory. It intentionally allows named Alice/Bob/provider simulation and is **not an ownership-security boundary**.

Demo mutation requests also include `expectedVersion` so the showcase exercises the same optimistic transition semantics as the authenticated API.
