# How to Verify

## 1. Install

```bash
cp .env.example .env
npm install
```

## 2. Run the complete repository checks

```bash
npm run check
```

The current tests cover:

- current-owner authorization;
- stale-owner rejection after transfer;
- two independent provider IDs following the new owner;
- provider allow-list enforcement;
- claim decrement and exhaustion;
- concurrent attempts against the final claim;
- optimistic entitlement-version conflicts;
- owner/provider/issuer credential enforcement;
- issuer identity binding on creation;
- suspension and irreversible revocation;
- stable API error envelopes;
- complete disabling of demo routes;
- readiness/liveness separation.

## 3. Run the browser demo

```bash
npm run dev
```

Open `http://localhost:5173` and follow the numbered lifecycle.

## 4. API-only demo verification

```bash
curl http://localhost:8787/health/ready
curl -X POST http://localhost:8787/demo/reset
curl http://localhost:8787/entitlements
```

Use the returned entitlement ID:

```bash
curl -X POST http://localhost:8787/demo/entitlements/ENT_ID/verify \
  -H 'content-type: application/json' \
  -d '{"providerId":"repair-a","claimant":"alice"}'

curl -X POST http://localhost:8787/demo/entitlements/ENT_ID/transfer \
  -H 'content-type: application/json' \
  -d '{"from":"alice","to":"bob","expectedVersion":1}'

curl -X POST http://localhost:8787/demo/entitlements/ENT_ID/verify \
  -H 'content-type: application/json' \
  -d '{"providerId":"repair-a","claimant":"alice"}'

curl -X POST http://localhost:8787/demo/entitlements/ENT_ID/verify \
  -H 'content-type: application/json' \
  -d '{"providerId":"repair-b","claimant":"bob"}'
```

Expected sequence: `ALLOW Alice` → transfer → `WRONG_OWNER Alice` → `ALLOW Bob`.

## 5. Verify authenticated provider identity

With the sample `.env` values:

```bash
curl -X POST http://localhost:8787/entitlements/ENT_ID/verify \
  -H 'content-type: application/json' \
  -H 'x-provider-id: repair-a' \
  -H 'x-provider-key: change-me-provider-a' \
  -d '{"claimant":"alice"}'
```

Omitting or changing the key must return `401`.

## 6. Verify the CKB fail-closed boundary

Set:

```env
LEDGER_MODE=ckb
ENABLE_DEMO_ENDPOINTS=false
```

`GET /health/live` should remain process-live, while `GET /health/ready` returns `503` until the real Cell protocol implementation exists. This is intentional: the repository does not claim an unfinished adapter is production CKB functionality.
