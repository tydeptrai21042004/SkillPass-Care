# SkillPass Care

SkillPass Care is a prototype for **portable service rights for second-hand products**. A seller issues a service entitlement, the current entitlement owner can transfer it to a buyer, and accepted providers independently verify the latest entitlement state before providing service.

> Important: the software enforces transfer of the **service entitlement**. For ordinary physical products it cannot independently prove that the physical item changed hands. A pilot should transfer the service right as part of the sale flow. A future CKB-native product asset could make product + service-right transfer atomic.

## v0.4 security/protocol hardening

- Provider verification no longer trusts a caller-supplied `claimant` string by itself.
- Provider creates a short-lived, request-bound owner challenge.
- The owner proves possession in the pilot with `HMAC-SHA256-PILOT`; a CKB wallet signature replaces this later.
- Challenges bind entitlement, provider, claimant, action and (for claims) `serviceEventId`.
- Claims are idempotent by `providerId + serviceEventId` and bind the idempotency key to the original request hash.
- Entitlement reads are actor-scoped: issuers see what they issued, owners see what they own, providers see rights that accept them.
- Provider verification evidence includes request hash, entitlement version/state reference, expiry and a clearly labeled pilot HMAC signature.
- `schemaVersion` is distinct from mutable state `version`.
- A canonical CKB V1 data model is defined; owner is intentionally excluded from Cell data because CKB ownership must come from the live Cell lock.
- CKB mutation/read operations still fail closed until the real type script, indexer resolution and wallet transaction flow exist.
- Production demo sessions require a strong secret; production pilot mode additionally requires a strong owner-challenge secret and complete actor credentials.
- Conflicting legacy Vercel entrypoints were removed. `api/router.ts` is the only serverless entrypoint.

## Runtime boundaries

```text
Public browser demo
  └─ signed HttpOnly browser-session state
     └─ non-authoritative Alice → Bob showcase

Authenticated pilot API
  ├─ issuer credentials
  ├─ provider credentials
  ├─ owner proof challenge / proof-of-possession
  └─ ServiceRightLedger
       └─ InMemoryLedger (local / controlled single-process pilot only)

CKB boundary
  ├─ RPC health probe
  ├─ versioned V1 Cell-data model
  └─ reads/writes fail closed until canonical live-Cell implementation exists
```

The UI never presents the public demo or memory ledger as an on-chain transfer.

## Repository layout

```text
api/router.ts                    Vercel API entrypoint
apps/api/                        HTTP/auth/challenge/runtime boundary
apps/web/                        public product/reviewer demo
packages/core/                   domain model, authorization, transitions
packages/shared/                 DTOs/errors/proof/evidence types
packages/ckb-adapter/            memory ledger + CKB boundary + V1 Cell schema
packages/provider-sdk/           provider verifier + signed pilot evidence
packages/config/                 environment validation
docs/                            protocol, security, deployment and pilot notes
```

## Local development

Requirements: Node.js 22 and npm 10.

```bash
cp .env.example .env
npm install --no-audit --no-fund
npm run check
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api/*` to the local API on port `8787`.

## Production caveats

The memory ledger is not durable across horizontally scaled/serverless instances. Do not use it as production entitlement storage. The next protocol milestone is canonical CKB live-Cell resolution and wallet-signed transitions; until then CKB mode deliberately returns `NOT_IMPLEMENTED` for state operations.

The repository pins direct dependency versions, but this archive does not contain a fabricated lockfile because registry access was unavailable while preparing it. Generate and commit `package-lock.json` from a networked environment before a production release.
