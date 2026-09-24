# SkillPass Care

**Portable product-service coverage built as a reference application on SkillPass.**

SkillPass Care deliberately keeps **ownership** separate from **application state**:

- **SkillPass** answers who currently controls the portable service right from canonical CKB state.
- **SkillPass Care** owns product commitment, Care plan, remaining units, service history, provider workflow, and issuer suspension/revocation.

**No shared entitlement-owner database is required between providers.** Care never treats its application database as the authoritative entitlement-owner database.

## Flagship lifecycle

```text
STANDARD_90D issued to Alice
3 coverage units
        |
        +-- Provider A verifies Alice
        +-- diagnostic service: 3 -> 2

Alice transfers the SkillPass service right to Bob
        |
        +-- old Alice ownership state becomes stale

After transfer
        +-- Alice -> DENY
        +-- Provider B independently verifies Bob
        +-- repair service: 2 -> 1

Final Care state
remaining coverage = 1
history = Provider A diagnostic + Provider B repair
current owner = resolved from SkillPass, not Care storage
```

> **Physical-product honesty boundary:** Care proves/control-checks the service entitlement associated with a product commitment. It does not independently prove possession or legal title to an ordinary physical product.

## Architecture

```text
Canonical SkillPass / CKB ownership
  current live service-right owner
  transfer
  request-bound authorization evidence
                 |
                 v
      SkillPassOwnershipPort
                 |
                 +-------------------+
                 |                   |
                 v                   v
        Care policy/store       Provider workflow
        plan + quota            independent policy
        service history         scoped service events
        issuer status
```

The target production composition is already represented in code:

```text
CanonicalSkillPassOwnership
          +
PostgresCareStore
          |
          v
SplitServiceRightLedger
```

`apps/api/src/runtime.ts` supports this composition through an injected canonical `SkillPassOwnershipPort`. The default `LEDGER_MODE=ckb` path still fails closed when no real binding is configured; RPC reachability is never presented as successful ownership integration.

See:

- `skillpass.protocol.json`
- `docs/SKILLPASS_INTEGRATION.md`
- `docs/ARCHITECTURE.md`
- `docs/DURABLE_STORE.md`
- `docs/SERVICE_EVENTS.md`
- `docs/NON_GOALS.md`

## Current hardening

- Workspace packages use the `@skillpass-care/*` namespace.
- Reference plans: `STANDARD_90D`, `PREMIUM_365D`, `BATTERY_180D`.
- Service type and units are bound into the owner-approved request.
- Typed `ServiceEventRecord` entries retain before/after version, stateRef and authorization-evidence hash.
- Exact service-event retries are idempotent; changed request details conflict.
- Memory and PostgreSQL now share one Care transition implementation.
- PostgreSQL uses row locking + optimistic versioning + atomic event insertion.
- Both stores re-check SkillPass ownership state before committing service consumption.
- In-memory mutations are serialized per entitlement so final-unit concurrency has one winner.
- `CanonicalSkillPassOwnership` validates canonical request/evidence identity and CKB-shaped state refs.
- Runtime can compose canonical ownership with either memory or PostgreSQL Care state.
- Cross-provider continuity tests cover Alice/Provider A -> transfer -> Bob/Provider B.
- `skillpass.protocol.json` pins the expected SkillPass Capability V2 compatibility contract.
- Clean repository preflight verifies hidden deployment files and the single Vercel API entrypoint.

## Runtime modes

### Local/demo

```text
LEDGER_MODE=memory
CARE_STORE_MODE=memory
```

Uses the in-memory SkillPass ownership simulator plus in-memory Care state.

### Persistence testing

```text
LEDGER_MODE=memory
CARE_STORE_MODE=postgres
```

Uses simulated ownership with durable Care state. This is useful for store/API testing, not proof of on-chain ownership.

### Canonical pilot target

```text
LEDGER_MODE=ckb
CARE_STORE_MODE=postgres
```

A production host must inject the real canonical `SkillPassOwnershipPort`. Without that binding, CKB mode intentionally stays fail closed.

## Repository layout

```text
api/router.ts                      Vercel API entrypoint
apps/api/                          HTTP/auth/challenge/runtime boundary
apps/web/                          product + reviewer demo
packages/core/                     Care domain model, plans, policy, transitions
packages/shared/                   DTOs, proof/evidence/service-event types
packages/care-store/               memory + PostgreSQL Care state
packages/ckb-adapter/              SkillPass ownership ports + split ledger
packages/provider-sdk/             independent provider verification + pilot evidence
packages/config/                   environment validation
db/                                durable Care schema
docs/                              product/protocol/security/pilot documentation
scripts/                           preflight + product commitment + boundary checks
```

The top-level structure intentionally remains stable.

## Local development

Requirements: Node.js 22 and npm 10.

```bash
cp .env.example .env
npm install --no-audit --no-fund
npm run check
npm run dev
```

Open `http://localhost:5173`.

## Reviewer verification

Dependency-free structural checks:

```bash
npm run verify:care
```

Full checks:

```bash
npm install --no-audit --no-fund
npm run check
```

When this repo is checked beside `ckb-skill`, the main SkillPass compatibility verifier can validate `skillpass.protocol.json`.

## Product commitment helper

Generate a domain-separated, salted product commitment:

```bash
npm run product:commitment -- seller-namespace serial-or-internal-id
```

Only the `sha256:<64 hex>` commitment belongs in the entitlement. Do not put customer PII or raw private product identifiers into public CKB state.

## Phase-1 non-goals

SkillPass Care is not trying to become:

- a Fiber/x402 payment protocol;
- a DID/reputation/credential system;
- a generic token-gating or agent-authorization framework;
- a marketplace or repair-provider settlement network;
- proof of physical possession.

Its purpose is narrower: demonstrate that **remaining service coverage and service history can continue across a canonical SkillPass ownership transfer and across independent providers**.

## Production caveats

The PostgreSQL Care store is implemented, but production still needs migration orchestration, operations/backup policy, real canonical SkillPass binding, wallet-native owner proof, asymmetric provider signatures, retained Testnet evidence and external pilot validation.

The current pilot HMAC credentials are intentionally labelled as pilot-only and must not be presented as production wallet cryptography.
