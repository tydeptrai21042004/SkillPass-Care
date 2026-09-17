# SkillPass Care Pilot

SkillPass Care demonstrates **portable service coverage that follows ownership**. A seller issues a service right for a product, independent providers verify the current owner, and a transfer makes the previous owner ineligible without requiring providers to share a customer-entitlement database.

This repository intentionally separates two things:

- **Executable local pilot:** secure-enough-for-local-development identity binding, deterministic state transitions, concurrency/version protection, provider verification evidence, lifecycle tests and a reviewer-friendly UI.
- **CKB production boundary:** explicit adapter and readiness behavior. CKB mode fails closed until a versioned SkillPass Cell schema and wallet-signed state-transition implementation are deployed. The code never presents an in-memory transfer as an on-chain transfer.

## What changed in v0.2

- Non-demo API routes no longer trust caller-supplied issuer/provider/owner identities.
- Provider and issuer identities are bound to server-side pilot credentials.
- Owner transfer on the local ledger is authenticated and supports optimistic version checks.
- Demo shortcuts are isolated under `/demo/*` and can be disabled completely.
- Entitlements support `ACTIVE`, `SUSPENDED` and irreversible `REVOKED` states.
- Stable JSON error envelopes distinguish validation, auth, forbidden, not-found and version-conflict failures.
- Liveness and readiness are separate.
- CKB mode probes RPC reachability but remains not-ready until the actual Cell protocol is implemented.
- Tests now cover provider allow-lists, claim exhaustion, concurrent final claims, stale versions, credentials, suspension/revocation and demo-route disabling.
- Added `.env.example`, CI and improved product/reviewer UI separation.

## Repository layout

```text
apps/
  api/                 HTTP API, authentication boundary and health endpoints
  web/                 Product + reviewer pilot UI
packages/
  core/                Domain model and pure authorization policy
  shared/              Shared DTOs, error and health types
  ckb-adapter/         Ledger interface, memory implementation, fail-closed CKB boundary
  provider-sdk/        Independent provider verification helper + evidence
  config/              Environment parsing and production safety checks

docs/                  Architecture, API, security, pilot and verification docs
```

## Quick start

Requirements: Node.js 20+ and npm 10+.

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. The API defaults to `http://localhost:8787`.

If you do not have a lockfile yet after modifying dependencies, run `npm install` once and commit the resulting `package-lock.json`.

## Local demo lifecycle

```text
Reset pass to Alice
      ↓
Provider A verifies Alice → ALLOW
      ↓
Transfer Alice → Bob (version checked)
      ↓
Provider A verifies Alice → DENY
Provider B verifies Bob   → ALLOW
      ↓
Provider B records service → remaining claim count decreases
```

The browser uses only `/demo/*` routes. Those routes are for demonstrations and user interviews, not deployment.

## Authenticated pilot API

Non-demo write/verification routes bind identity to configured credentials:

- issuer: `x-issuer-id` + `x-issuer-key`
- provider: `x-provider-id` + `x-provider-key`
- owner: `x-owner-id` + `x-owner-key`

These shared secrets are a **pilot boundary**, not the final CKB wallet-auth mechanism. In CKB mode, ownership transitions must be wallet-signed transactions that consume the current live Cell and create the successor Cell.

## Verify the repository

```bash
npm run typecheck
npm test
npm run build
# or all three
npm run check
```

See `docs/HOW_TO_VERIFY.md` for exact API examples and `docs/SECURITY.md` for what is and is not secured by this pilot.
