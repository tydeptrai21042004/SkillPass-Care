# SkillPass Care

**Portable service coverage for second-hand products, built as a reference product on SkillPass.**

SkillPass Care is intentionally more than a thin ownership demo. SkillPass provides the reusable portable-right primitive; Care adds the product-specific lifecycle that makes the primitive useful for a real service program:

- product binding through a privacy-preserving commitment;
- coverage plans and remaining service units;
- multi-provider service acceptance;
- typed, idempotent service-event history;
- issuer suspend/resume/revoke controls;
- current-owner proof before service;
- continuity of remaining coverage across resale.

## Flagship lifecycle

```text
STANDARD_90D issued to Alice
3 coverage units
        │
        ├─ Provider A verifies Alice
        └─ diagnostic service: 3 -> 2

Alice sells the product to Bob
        │
        └─ SkillPass ownership transfer: Alice -> Bob

After transfer
        ├─ Alice -> DENY
        ├─ Provider B verifies Bob
        └─ repair service: 2 -> 1

Final state
owner = Bob
remaining coverage = 1
history = Provider A diagnostic + Provider B repair
```

That cross-owner, cross-provider continuity is the main Care product demonstration.

> **Physical-product honesty boundary:** SkillPass Care proves control of the service entitlement associated with a product commitment. It does not independently prove possession of an ordinary physical product. The pilot pairs product handoff with service-right transfer operationally.

## Architecture

```text
SkillPass / CKB ownership layer
  current portable-right owner
  transfer
  owner proof
  provider authorization evidence
            │
            ▼
SkillPass Care application layer
  product commitment
  Care plan
  remaining coverage
  service-event history
  issuer controls
  provider workflow
```

The two layers are deliberately separate. Ownership transfer does **not** reset Care coverage or erase service history. Service use does **not** change ownership.

See:

- `docs/SKILLPASS_INTEGRATION.md`
- `docs/ARCHITECTURE.md`
- `docs/SERVICE_EVENTS.md`
- `docs/DURABLE_STORE.md`

## v0.5 improvements

- Workspace packages now use the `@skillpass-care/*` namespace instead of looking like duplicate core SkillPass packages.
- Added reference Care plans (`STANDARD_90D`, `PREMIUM_365D`, `BATTERY_180D`).
- Service requests bind `serviceType` and `unitsConsumed` into the owner-approved challenge.
- Added typed `ServiceEventRecord` audit entries with before/after state versions.
- Added `POST /entitlements/:id/service-events` as the preferred service-consumption API.
- Added actor-scoped `GET /entitlements/:id/service-events` history.
- Exact service-event retries remain idempotent; changed request details conflict.
- Added cross-provider continuity tests: Alice/Provider A -> transfer -> Bob/Provider B.
- Added stale pre-transfer service-proof rejection tests.
- Public demo now shows **service before transfer and service after transfer**, rather than only transfer + one final claim.
- Added a clean repository preflight, CI workflow, env template, Git ignore and Docker ignore.
- Removed conflicting legacy Vercel API entrypoints.

## Runtime boundaries

```text
Public browser demo
  signed HttpOnly session state
  rich Care lifecycle showcase
  NOT authoritative blockchain state

Authenticated pilot API
  issuer/provider/owner credentials
  request-bound owner proof
  typed service events
  actor-scoped reads
  InMemoryLedger for controlled single-process pilot/testing

CKB / SkillPass boundary
  RPC health probe
  legacy prototype codec retained only for compatibility tests
  live writes/read resolution still fail closed until canonical SkillPass integration exists
```

The UI never presents browser-session or memory-ledger mutations as real on-chain transactions.

## Repository layout

```text
api/router.ts                      Vercel API entrypoint
apps/api/                          HTTP/auth/challenge/runtime boundary
apps/web/                          product + reviewer demo
packages/core/                     Care domain model, plans, policy, transitions
packages/shared/                   DTOs, proof/evidence/service-event types
packages/ckb-adapter/              pilot coverage store + fail-closed CKB boundary
packages/provider-sdk/             provider verifier + signed pilot evidence
packages/config/                   environment validation
docs/                              product/protocol/security/pilot documentation
scripts/                           preflight + product commitment + Care boundary checks
```

## Local development

Requirements: Node.js 22 and npm 10.

```bash
cp .env.example .env
npm install --no-audit --no-fund
npm run check
npm run dev
```

Open `http://localhost:5173`.

## Quick structural verification

No dependency install is needed for the repository-level checks:

```bash
npm run verify:care
```

The full suite requires dependencies:

```bash
npm run check
```

## Product commitment helper

Generate a domain-separated, salted product commitment:

```bash
npm run product:commitment -- seller-namespace serial-or-internal-id
```

Only the `sha256:<64 hex>` commitment belongs in the entitlement. Keep the random salt private if future recomputation is needed.

## Production caveats

The in-memory coverage store is intentionally **not** durable across horizontally scaled/serverless instances. A real pilot should add a transactional durable Care store while SkillPass/CKB remains the authoritative portable-ownership source.

`LEDGER_MODE=ckb` still fails closed for state operations. That is deliberate until the main SkillPass repository exposes a deployed, versioned live-Cell integration and wallet-signed transfer flow.

The repository pins direct dependency versions, but this archive does not invent a transitive npm lockfile. Generate and commit `package-lock.json` from a networked environment before a production release, then use `npm ci` in CI/deployment.
