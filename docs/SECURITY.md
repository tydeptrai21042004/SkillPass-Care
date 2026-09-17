# Security Notes

## Security boundary in this version

The local pilot distinguishes **demo shortcuts** from **authenticated API routes**.

Authenticated routes do not accept issuer/provider/owner identity as authoritative JSON fields. Identity is bound to configured server-side credentials. Credential comparison uses a timing-safe comparison. This is suitable for a controlled pilot, but it is not a substitute for CKB wallet ownership proofs.

Demo routes live only under `/demo/*`. They are enabled by `ENABLE_DEMO_ENDPOINTS=true`, and configuration refuses to start production mode with demo routes enabled.

## Threats handled by the executable pilot

### Stale-owner access
Providers resolve the current entitlement before every decision. After transfer, old-owner verification fails.

### Caller-selected provider identity
The non-demo provider routes derive provider identity from authenticated headers; JSON cannot switch `repair-a` to another provider.

### Caller-selected issuer identity
Issuance and status changes derive issuer identity from authenticated headers.

### Caller-selected transfer source
The non-demo transfer route derives the source owner from authenticated owner credentials. There is no authoritative `from` field.

### Lost update / stale mutation
State-changing routes accept `expectedVersion`. A stale version returns `409 VERSION_CONFLICT` instead of silently overwriting newer state.

### Final-claim race in the local process
The memory ledger performs the read/check/write transition synchronously within a single JavaScript process. Tests assert that two simultaneous attempts against the final claim produce one winner. This property does not prove multi-process/on-chain atomicity.

### Lifecycle invalidation
Suspended and revoked passes fail authorization. Revocation is irreversible in the memory pilot.

### Error leakage
Known errors use stable public codes. Unexpected server exceptions are logged with a request ID and returned as a generic `500` message.

### Basic HTTP hardening
The API disables `x-powered-by`, limits JSON payload size, applies narrow configured CORS, and sets basic anti-sniff/frame/referrer headers.

## CKB boundary

`LEDGER_MODE=ckb` is intentionally fail-closed. The adapter can probe RPC reachability for diagnostics, but readiness remains false and state methods return `503 NOT_IMPLEMENTED` until all of the following are concrete:

1. Versioned SkillPass Cell data schema.
2. Stable entitlement identity/type-script strategy.
3. Owner derived from the live Cell lock script.
4. Wallet-signed issue/transfer transaction construction.
5. Canonical live-Cell resolution and confirmation policy.
6. Durable claim semantics under independent concurrent providers.
7. Issuer/provider trust material and rotation/revocation rules.

The application must never mutate an off-chain `owner` field and describe that operation as a CKB transfer.

## Production requirements before valuable rights

- Replace owner shared secrets with wallet-signed transactions/intents.
- Define canonical issuer keys and rotation/revocation.
- Sign provider manifests and bind provider policy versions.
- Add nonce + expiry + payload-hash replay protection for signed off-chain actions.
- Define confirmation/reorg policy.
- Store durable authorization/claim audit evidence.
- Use a durable datastore where any off-chain mutable state remains.
- Rate-limit authentication and mutation endpoints.
- Use a secret manager; never ship real keys in `.env` or browser bundles.
- Run dependency, secret and SAST scanning in CI.
- Obtain an external security review before mainnet/value-bearing usage.
