# Security Notes

## Security boundaries in this version

SkillPass Care separates:

- **public demo routes** under `/demo/*`, which simulate actors and keep non-authoritative state in a signed browser cookie;
- **authenticated pilot routes**, which bind issuer/provider/owner identity to server-configured credentials;
- **CKB mode**, which remains fail-closed until real live-Cell state transitions exist.

The public demo can be deployed in production because it is isolated and explicitly non-authoritative. It is not a substitute for wallet proof or durable ledger state.

## Controls implemented

### Stale-owner access
Providers resolve the current entitlement before every decision. After transfer, old-holder verification fails.

### Caller-selected provider/issuer/transfer identity
Authenticated routes derive provider, issuer and transfer-source owner from credentials. Caller JSON cannot override those identities.

### Protected reads
Entitlement list/detail endpoints require a valid configured actor credential and are no longer anonymously readable.

### Lost update / stale mutation
Authenticated transfer, claim and status routes require `expectedVersion`. A stale version returns `409 VERSION_CONFLICT` rather than silently overwriting newer state.

### Shared transition semantics
The memory ledger and browser-session demo both use the pure transition functions in `packages/core`, reducing semantic drift between demonstration and API behavior.

### Demo session integrity
Demo state is HMAC-signed and stored in an `HttpOnly`, `SameSite=Lax` cookie. A deployment-specific `DEMO_SESSION_SECRET` is strongly recommended. The cookie contains no production credentials and is not considered authoritative ownership evidence.

### Lifecycle invalidation
Suspended and revoked passes fail authorization. Revocation is irreversible in the memory pilot.

### Error handling
Known errors use stable public codes. Unexpected exceptions are logged with a request ID and return a generic `500` response.

### HTTP hardening
The API:

- disables `x-powered-by`;
- limits JSON request bodies to 64 KiB;
- emits no-store headers for API responses;
- adds CSP/frame/sniff/referrer/permissions headers;
- emits HSTS in production;
- applies CORS only when an explicit allow-list is configured.

The Vercel static deployment adds corresponding frontend security headers and immutable caching for hashed assets.

## Serverless limitation

`InMemoryLedger` is process-local. It is **not** durable across Vercel function instances and must not back real customer rights on a horizontally scaled deployment. The public demo avoids this issue by carrying demo state in the signed browser session.

A real off-chain production pilot needs a durable datastore-backed `ServiceRightLedger`; the intended chain-backed production path needs the CKB adapter described below.

## CKB boundary

`LEDGER_MODE=ckb` can probe RPC reachability for diagnostics, but readiness remains false and state methods return `503 NOT_IMPLEMENTED` until the project has:

1. a versioned SkillPass Cell data schema;
2. stable entitlement identity/type-script strategy;
3. ownership derived from the canonical live Cell lock script;
4. wallet-signed issue/transfer transaction construction;
5. canonical live-Cell resolution and confirmation/reorg policy;
6. durable claim semantics under independent concurrent providers;
7. issuer/provider trust material with rotation/revocation rules.

The application must never mutate an off-chain `owner` field and describe that operation as a CKB transfer.

## Before value-bearing usage

- Replace owner shared secrets with wallet-signed transactions/intents.
- Define issuer keys and rotation/revocation procedures.
- Sign provider manifests and bind provider policy versions.
- Add nonce + expiry + payload-hash replay protection for any signed off-chain actions.
- Define confirmation/reorg behavior.
- Store durable authorization/claim audit evidence.
- Add a durable datastore for any remaining off-chain mutable state.
- Add distributed rate limiting for auth and mutation endpoints.
- Keep secrets only in the deployment secret manager.
- Run dependency, secret and SAST scanning in CI.
- Obtain an external security review before mainnet or valuable rights.
