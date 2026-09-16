# SkillPass Care Pilot

SkillPass Care is a product-oriented pilot for **portable service coverage that follows ownership**.

The project is deliberately structured around a real workflow rather than a generic token-gating demo:

1. A seller or service-plan issuer creates a service entitlement for a device/product.
2. The entitlement has a current owner.
3. Independent service providers verify the same entitlement without sharing a customer-entitlement database.
4. When ownership changes, the entitlement can transfer to the new owner.
5. The old owner is rejected after transfer.

The repository ships with an **in-memory ledger** so the entire lifecycle can be demonstrated locally. The CKB testnet adapter boundary is isolated in `packages/ckb-adapter`; replacing the in-memory adapter with real CCC/CKB calls should not require rewriting the provider SDK or business logic.

## Repository layout

```text
apps/
  api/                 HTTP API for issuance, transfer, verification and claims
  web/                 Lightweight pilot UI
packages/
  core/                Domain models and policy logic
  shared/              Shared DTOs and utilities
  ckb-adapter/         Ledger interface, memory implementation, CKB placeholder
  provider-sdk/        Provider-side independent verification helper
  config/              Environment parsing

docs/                  Product, architecture, security, pilot and verification docs
```

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

Then open `http://localhost:5173`.

The API runs at `http://localhost:8787`.

## Demo lifecycle

The UI can exercise:

```text
Issue pass to Alice
      ↓
Provider A verifies Alice → ALLOW
      ↓
Transfer Alice → Bob
      ↓
Provider A verifies Alice → DENY
Provider B verifies Bob   → ALLOW
      ↓
Record a service claim
```

## Important implementation note

This is a **pilot scaffold**, not a claim that the current ledger code is production CKB code. The memory ledger enforces the same domain invariants expected from a live-Cell implementation, while `CkbLedgerAdapter` documents the methods that must be backed by CCC/CKB RPC/indexer calls.

See:

- `docs/ARCHITECTURE.md`
- `docs/PILOT_PLAN.md`
- `docs/PROVIDER_INTEGRATION.md`
- `docs/HOW_TO_VERIFY.md`
- `docs/SECURITY.md`
- `docs/ROADMAP.md`
