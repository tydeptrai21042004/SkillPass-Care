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

The repository intentionally keeps `NODE_ENV=production` for deployed runtime security, while the Vercel install command uses `npm install --production=false` so build-time tools such as TypeScript are still installed. The root `.npmrc` also sets `include=dev` as a defensive fallback.

If a build fails with `tsc: command not found`, verify that Vercel is using the repository-root `vercel.json` and that the Install Command has not been overridden in the dashboard. The expected command is:

```text
npm install --production=false --no-audit --no-fund
```

### 2. Add environment variables

Required secret for the public demo:

```env
DEMO_SESSION_SECRET=<at-least-32-random-bytes>
```

For this repository's Vercel deployment, `vercel.json` deliberately pins the two **non-secret** public-demo flags passed to Vercel Functions:

```env
ENABLE_DEMO_ENDPOINTS=true
LEDGER_MODE=memory
```

This prevents the web UI from deploying successfully while `/api/demo/*` is accidentally disabled. Keep `DEMO_SESSION_SECRET` in Vercel Project Settings rather than source control.

`DEMO_SESSION_SECRET` protects the integrity of the demo cookie. The public demo is still explicitly non-authoritative and must never be treated as a real ownership proof.

You normally do **not** need `WEB_ORIGINS` on Vercel because the browser calls `/api` on the same origin.

### 3. Verify after deployment

The deployment uses a fixed Vercel Function at `api/router.ts` and explicit
rewrites for `/api` and `/api/:path*`. This is intentional: it avoids relying
on framework-style splat-function discovery for the standalone Vite app.

The old `api/[...path].ts` and `api/index.ts` entrypoints must not be present
in the deployed repository. Vercel gives filesystem routes precedence over
rewrites, so leaving the old splat function in place can intercept `/api/meta`
before the fixed router rewrite runs.

Check:

```text
GET /api/health/live   -> 200
GET /api/health/ready  -> 200 in memory demo mode
GET /api/meta          -> demoEnabled: true, demoRoute: "/demo/state"
GET /api/demo/state    -> 200
```

Then run the UI lifecycle:

```text
Reset → Verify Alice → Transfer to Bob → Reject Alice → Verify Bob → Use service
```

Reload the page after transfer. The demo state should remain in the same browser session.


### Vercel `404 NOT_FOUND` on `/api/meta`

If Vercel's own 404 page appears (rather than the API's JSON `NOT_FOUND`
response), the request never reached Express. Confirm that the deployed
`vercel.json` contains these rewrites:

```json
"rewrites": [
  { "source": "/api", "destination": "/api/router" },
  {
    "source": "/api/:path*",
    "destination": "/api/router?__skillpass_path=:path*"
  }
]
```

Also confirm the deployment contains `api/router.ts` and that the Vercel
project Root Directory is the repository root. Do not point the Root Directory
at `apps/api` or `apps/web`.

## Authenticated off-chain pilot

To disable public demo routes and expose the credential-bound pilot API, first remove the public-demo `env` block from `vercel.json` (or use a separate deployment configuration), then configure:

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
