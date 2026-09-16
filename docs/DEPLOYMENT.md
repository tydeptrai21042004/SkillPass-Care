# Deployment Sketch

## Local

```bash
npm install
npm run dev
```

## Production-like split

```text
Web UI  -> Vercel / static host
API     -> Railway / Fly / container host
Ledger  -> CKB testnet RPC + indexer
Provider SDK -> runs inside each provider backend
```

## Environment variables

See `.env.example`.

For a real deployment:

- never commit issuer/provider private keys;
- pin Node.js version;
- commit a lockfile;
- use separate provider credentials;
- enable structured logs;
- configure CORS narrowly;
- disable the demo reset endpoint.
