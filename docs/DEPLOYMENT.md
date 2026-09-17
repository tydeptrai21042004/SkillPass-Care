# Deployment

## Local

```bash
cp .env.example .env
npm install
npm run check
npm run dev
```

## Required production settings

At minimum:

```env
NODE_ENV=production
ENABLE_DEMO_ENDPOINTS=false
WEB_ORIGINS=https://your-real-web-origin.example
```

Provide secrets through the deployment platform, not source control:

```env
ISSUER_KEYS=issuer-id:<secret>
PROVIDER_KEYS=provider-a:<secret>,provider-b:<secret>
OWNER_KEYS=pilot-owner:<secret>
```

The `OWNER_KEYS` mechanism is only for a controlled off-chain pilot. A CKB deployment must replace it with wallet-signed ownership/state transitions.

## Health checks

- liveness: `/health/live`
- readiness: `/health/ready`

Route production traffic only when readiness returns `200`.

## CKB mode

`LEDGER_MODE=ckb` is not considered ready in this version. RPC reachability is reported for diagnostics, but state operations are fail-closed until the SkillPass Cell schema and signed transaction flow are implemented.

## Container

```bash
docker compose up --build
```

The compose configuration is a local memory-ledger demo and intentionally enables demo endpoints. Do not reuse it unchanged for production.
