# API Reference

Default base URL: `http://localhost:8787`.

All errors use:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "stale entitlement version: expected 1, current 2",
    "requestId": "..."
  }
}
```

## Health

### `GET /health/live`
Process liveness only.

### `GET /health/ready`
Returns ledger readiness. Memory mode is ready. CKB mode is deliberately `503` until the real SkillPass Cell state-transition adapter exists.

### `GET /health`
Alias for readiness.

## Read routes

### `GET /entitlements`
Lists currently resolved pilot entitlements.

### `GET /entitlements/:id`
Returns one entitlement or `404`.

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

`issuerId` is taken from the authenticated header and cannot be selected in JSON.

### `PATCH /entitlements/:id/status`

```json
{"status":"SUSPENDED","expectedVersion":2}
```

Allowed status values: `ACTIVE`, `SUSPENDED`, `REVOKED`. Revocation is irreversible in the pilot ledger.

## Authenticated owner transfer

Headers:

```text
x-owner-id: alice
x-owner-key: <server-configured secret>
```

### `POST /entitlements/:id/transfer`

```json
{"to":"bob","expectedVersion":1}
```

The transfer source is the authenticated owner, not a `from` field supplied by the request body. A stale `expectedVersion` returns `409`.

## Authenticated provider routes

Headers:

```text
x-provider-id: repair-a
x-provider-key: <server-configured secret>
```

### `POST /entitlements/:id/verify`

```json
{"claimant":"bob"}
```

The response includes verification evidence: provider ID, claimant, entitlement version and verification timestamp.

### `POST /entitlements/:id/claim`

```json
{"claimant":"bob","expectedVersion":2}
```

## Demo-only routes

Available only when `ENABLE_DEMO_ENDPOINTS=true`:

- `POST /demo/reset`
- `POST /demo/entitlements/:id/transfer`
- `POST /demo/entitlements/:id/verify`
- `POST /demo/entitlements/:id/claim`

They intentionally allow named Alice/Bob/provider simulation so the browser can demonstrate the lifecycle without embedding server credentials. Production configuration rejects `ENABLE_DEMO_ENDPOINTS=true`.
