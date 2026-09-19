# Deployment

## Vercel public demo

The deployment uses one API entrypoint: `api/router.ts`. Do not restore `api/index.ts` or `api/[...path].ts`.

Required production environment variable:

```env
DEMO_SESSION_SECRET=<at-least-32-random-characters>
```

`vercel.json` does **not** hardcode deployment mode. The application defaults remain `ENABLE_DEMO_ENDPOINTS=true` and `LEDGER_MODE=memory`, but production behavior should be controlled through deployment environment variables. This keeps the same repository usable for the public demo and a separate authenticated pilot without editing deployment config.

The memory ledger is not used for public demo lifecycle state; the demo uses a signed HttpOnly browser-session cookie.

Deploy from the repository root. The rewrites map `/api/:path*` to `api/router.ts`.

## Authenticated off-chain pilot

Configure at minimum:

```env
NODE_ENV=production
ENABLE_DEMO_ENDPOINTS=false
LEDGER_MODE=memory
OWNER_PROOF_CHALLENGE_SECRET=<at-least-32-random-characters>
OWNER_PROOF_TTL_SECONDS=120
ISSUER_KEYS=seller-id:<random-secret>
PROVIDER_KEYS=provider-a:<random-secret>,provider-b:<random-secret>
OWNER_KEYS=owner-a:<random-secret>,owner-b:<random-secret>
```

Each production actor secret must be at least 16 characters. Use a real secret manager and rotation procedure.

### Critical limitation

`InMemoryLedger` is process-local. Do not treat a horizontally scaled Vercel deployment as durable pilot storage. Use a database-backed adapter or implement the CKB adapter before real entitlement use.

## CKB mode

```env
LEDGER_MODE=ckb
CKB_RPC_URL=https://testnet.ckbapp.dev
CKB_INDEXER_URL=https://testnet.ckbapp.dev
```

CKB readiness remains false and state operations return `503 NOT_IMPLEMENTED` until live-Cell resolution, type-script/schema deployment, wallet transactions and claim semantics exist.

## Local verification

```bash
cp .env.example .env
npm install --no-audit --no-fund
npm run check
npm run dev
```

## Post-deploy smoke checks

1. `GET /api/meta` returns v0.4 metadata.
2. `GET /api/demo/state` returns the demo right when demo mode is enabled.
3. Alice verifies in the demo, transfer Alice→Bob succeeds, then Alice is denied and Bob is accepted.
4. `GET /api/entitlements` returns `401` without credentials.
5. Authenticated pilot verification rejects a bare claimant without challenge/proof.
6. Actor-scoped reads do not reveal unrelated rights.
7. Repeating the same claim event does not decrement twice.
8. CKB mode still fails closed until the real protocol is enabled.

## Dependency reproducibility

Direct dependency versions are exact-pinned. Registry access was unavailable while preparing this archive, so no fake lockfile is included. In a networked environment run `npm install`, commit the generated `package-lock.json`, then change CI/Vercel installation to `npm ci` for the release branch.
