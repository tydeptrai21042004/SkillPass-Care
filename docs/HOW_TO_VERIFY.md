# How to verify the build

## Automated checks

```bash
npm install
npm run check
```

The check command runs workspace type checks, tests, package builds, API build, and web build.

## Public demo API locally

Start the project:

```bash
npm run dev
```

The browser uses `http://localhost:5173/api/*`, which Vite proxies to the API. For direct API testing, use port `8787`.

Use a cookie jar because the demo lifecycle is session-scoped:

```bash
curl -c /tmp/skillpass-cookie -b /tmp/skillpass-cookie \
  http://localhost:8787/demo/state
```

Reset:

```bash
curl -c /tmp/skillpass-cookie -b /tmp/skillpass-cookie \
  -H 'content-type: application/json' \
  -d '{}' \
  http://localhost:8787/demo/reset
```

From the returned JSON, note the entitlement `id` and current `version`.

Verify Alice:

```bash
curl -c /tmp/skillpass-cookie -b /tmp/skillpass-cookie \
  -H 'content-type: application/json' \
  -d '{"providerId":"repair-a","claimant":"alice"}' \
  http://localhost:8787/demo/entitlements/ENT_ID/verify
```

Transfer Alice → Bob:

```bash
curl -c /tmp/skillpass-cookie -b /tmp/skillpass-cookie \
  -H 'content-type: application/json' \
  -d '{"from":"alice","to":"bob","expectedVersion":1}' \
  http://localhost:8787/demo/entitlements/ENT_ID/transfer
```

Verify the previous owner is denied:

```bash
curl -c /tmp/skillpass-cookie -b /tmp/skillpass-cookie \
  -H 'content-type: application/json' \
  -d '{"providerId":"repair-a","claimant":"alice"}' \
  http://localhost:8787/demo/entitlements/ENT_ID/verify
```

Verify Bob at Provider B:

```bash
curl -c /tmp/skillpass-cookie -b /tmp/skillpass-cookie \
  -H 'content-type: application/json' \
  -d '{"providerId":"repair-b","claimant":"bob"}' \
  http://localhost:8787/demo/entitlements/ENT_ID/verify
```

## Protected-read check

Without credentials this must return `401`:

```bash
curl -i http://localhost:8787/entitlements
```

With configured provider credentials it should return the pilot ledger state:

```bash
curl \
  -H 'x-provider-id: repair-a' \
  -H 'x-provider-key: local-provider-a-secret' \
  http://localhost:8787/entitlements
```

## Vercel post-deploy smoke test

Replace `https://YOUR-PROJECT.vercel.app` below:

```bash
curl https://YOUR-PROJECT.vercel.app/api/health/live
curl https://YOUR-PROJECT.vercel.app/api/health/ready
curl https://YOUR-PROJECT.vercel.app/api/meta
```

Then open the deployment in a browser and run all six lifecycle buttons. Reload after transfer and confirm Bob remains the current demo holder for that browser session.
