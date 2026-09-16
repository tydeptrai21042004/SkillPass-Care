# API Reference

Base URL: `http://localhost:8787`

## `GET /health`
Returns process status.

## `GET /entitlements`
Lists current demo entitlements.

## `POST /entitlements`
Creates a service entitlement.

Example body:

```json
{
  "issuerId": "seller-demo",
  "productHash": "sha256:device-001",
  "owner": "alice",
  "serviceClass": "STANDARD_90D",
  "remainingClaims": 3,
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "transferable": true,
  "acceptedProviderIds": ["repair-a", "repair-b"]
}
```

## `POST /entitlements/:id/transfer`

```json
{"from":"alice","to":"bob"}
```

## `POST /entitlements/:id/verify`

```json
{"providerId":"repair-a","claimant":"bob"}
```

## `POST /entitlements/:id/claim`

```json
{"providerId":"repair-a","claimant":"bob"}
```

## `POST /demo/reset`
Recreates a deterministic Alice demo entitlement.
