# SkillPass Care

SkillPass Care demonstrates **portable service coverage that follows product ownership**. A seller issues a service right for a product, independent service providers verify the current holder, and a transfer makes the previous holder ineligible without requiring every provider to share one customer-entitlement database.

## Current scope

This repository deliberately separates three concerns:

1. **Public Vercel demo** — deterministic Alice → Bob lifecycle using a signed, HttpOnly browser-session cookie. It is designed for serverless deployment and does not depend on process memory.
2. **Authenticated pilot API** — issuer/provider/owner identities are bound to server-side credentials; optimistic version checks are required for mutations. The memory ledger is intended for local or single-process pilots only.
3. **CKB boundary** — the adapter probes CKB RPC health but fails closed for reads/writes until the SkillPass Cell schema, canonical live-Cell resolution, and wallet-signed state transitions are implemented.

The UI never labels the public demo or the memory ledger as an on-chain transfer.

## What v0.3 improves

- Vercel-ready same-origin `/api/*` deployment with a root `vercel.json`.
- Stateless public demo sessions, avoiding unreliable cross-instance in-memory state on serverless infrastructure.
- Protected entitlement list/detail routes instead of public reads.
- Required `expectedVersion` on authenticated transfer/claim/status mutations.
- Shared pure transition functions used by both the memory ledger and demo session.
- Security headers, request IDs, API no-store policy, strict JSON body limits, safer auth errors, and optional explicit CORS allow-list.
- Polished product/reviewer UI, responsive layout, loading/error states, clearer lifecycle controls, and explicit CKB honesty boundary.
- Vite `/api` proxy for local same-origin behavior.
- Vercel build script, `.env.example`, `.gitignore`, CI workflow, and deployment checklist.

## Repository layout

```text
api/
  [...path].ts          Vercel serverless entrypoint
apps/
  api/                  Express API, demo session, auth boundary, runtime
  web/                  Vite + React product/reviewer UI
packages/
  core/                 Domain model, authorization and pure transitions
  shared/               Shared DTOs/errors
  ckb-adapter/           Memory ledger + fail-closed CKB boundary
  provider-sdk/          Provider verification helper
  config/                Runtime environment parsing

docs/                    Architecture, security and deployment notes
```

## Local development

Requirements: Node.js 20+ and npm 10+.

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api/*` to the local API on port `8787`, so the browser behaves like the Vercel same-origin deployment.

Run verification with:

```bash
npm run check
```

