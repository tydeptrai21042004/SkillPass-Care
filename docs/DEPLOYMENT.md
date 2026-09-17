# Deployment

## Recommended: public Vercel demo

The public demo is designed to work correctly on Vercel's horizontally scaled runtime. Demo entitlement state is serialized into a signed, HttpOnly cookie, so the Alice → Bob lifecycle does not depend on one function instance retaining memory between requests.

### 1. Import the repository

Create a Vercel project from the repository root. Do not set the Root Directory to `apps/web`; the root contains the API function and `vercel.json`.

Vercel should use:

```text
Build command: npm run build:vercel
Output directory: apps/web/dist
```

These are already specified in `vercel.json`.

### 2. Add environment variables

Recommended for the public demo:

```env
DEMO_SESSION_SECRET=<at-least-32-random-bytes>
ENABLE_DEMO_ENDPOINTS=true
LEDGER_MODE=memory
```

`DEMO_SESSION_SECRET` protects the integrity of the demo cookie. The public demo is still explicitly non-authoritative and must never be treated as a real ownership proof.

You normally do **not** need `WEB_ORIGINS` on Vercel because the browser calls `/api` on the same origin.

### 3. Verify after deployment

Check:

```text
GET /api/health/live   -> 200
GET /api/health/ready  -> 200 in memory demo mode
GET /api/meta          -> demoEnabled: true
```

Then run the UI lifecycle:

```text
Reset → Verify Alice → Transfer to Bob → Reject Alice → Verify Bob → Use service
```

Reload the page after transfer. The demo state should remain in the same browser session.

## Authenticated off-chain pilot

To disable public demo routes and expose the credential-bound pilot API:

```env
NODE_ENV=production
ENABLE_DEMO_ENDPOINTS=false
LEDGER_MODE=memory
ISSUER_KEYS=seller-id:<secret>
PROVIDER_KEYS=provider-a:<secret>,provider-b:<secret>
OWNER_KEYS=owner-a:<secret>,owner-b:<secret>
```

The HTTP API requires `expectedVersion` for transfer, claim, and status mutations.

### Important limitation

The current memory ledger is process-local. It is suitable for local development or a controlled single-process pilot, **not** durable horizontally scaled Vercel production state. Do not use it for real customer entitlements on serverless infrastructure.

For a durable off-chain pilot, add a database-backed `ServiceRightLedger`. For the intended CKB architecture, implement the live-Cell adapter instead.

## CKB mode

```env
LEDGER_MODE=ckb
CKB_RPC_URL=https://testnet.ckbapp.dev
CKB_INDEXER_URL=https://testnet.ckbapp.dev
```

CKB mode currently performs only an RPC health probe. Readiness stays false and state operations return `503 NOT_IMPLEMENTED` until all of the following exist:

- a versioned SkillPass Cell schema,
- canonical live-Cell resolution,
- wallet-signed issuance/transfer flow,
- durable claim semantics,
- issuer-controlled status transition rules.

This fail-closed behavior is intentional.

## Local development

```bash
cp .env.example .env
npm install
npm run check
npm run dev
```

Frontend: `http://localhost:5173`

API: `http://localhost:8787`

The Vite dev server proxies browser requests from `/api/*` to the local API, matching the production same-origin URL shape.

## Security checklist

Before any non-demo deployment:

- rotate all pilot secrets and keep them only in Vercel environment variables;
- disable `/demo/*` when it is not needed;
- keep `WEB_ORIGINS` empty for same-origin deployments, or set an exact allow-list for intentional cross-origin clients;
- do not expose a memory ledger as durable production storage;
- confirm `/api/entitlements` returns `401` without credentials;
- confirm all mutation clients send `expectedVersion`;
- verify the deployed Content-Security-Policy and HSTS headers;
- confirm CKB mode remains fail-closed until the real protocol is deployed.
