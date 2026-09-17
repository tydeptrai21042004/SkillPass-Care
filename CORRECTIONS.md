# Correction Summary — v0.3.0

## Vercel deployment

- Added root `vercel.json` for a Vite static frontend plus Node API functions.
- Added `/api/[...path].ts` and `/api/index.ts` Vercel entrypoints.
- Added `npm run build:vercel` and same-origin Vite `/api` proxy behavior.
- Public demo state no longer depends on function/process memory; it uses a signed, HttpOnly browser-session cookie.
- Added production/static security headers and immutable asset caching.
- Added a Vercel deployment guide and post-deploy smoke-test instructions.

## API and security

- Protected entitlement list/detail routes with actor authentication.
- Required `expectedVersion` on authenticated transfer, claim and status mutations.
- Improved authentication failure messages to avoid credential-detail leakage.
- Added API metadata route, no-store responses, HSTS in production, CSP/permissions headers, request IDs and optional explicit CORS.
- Added demo-session integrity validation and session-isolation tests.

## Domain consistency

- Added shared pure transition functions for transfer, claim and status changes.
- Reused the same transition semantics in the memory ledger and public demo.
- Preserved the fail-closed CKB adapter and explicit non-on-chain demo wording.

## Product UI

- Reworked the frontend into a polished product/reviewer experience.
- Added responsive lifecycle visualization, current-holder state, provider acceptance, progress cues, API status, evidence log, loading/error states and reviewer readiness details.
- Made the CKB implementation boundary visible instead of implying unsupported chain functionality.

## Repository quality

- Added `.env.example`, `.gitignore`, GitHub Actions CI and Vercel-specific TypeScript configuration.
- Updated API, architecture, security, deployment and verification documentation.
- Bumped workspace package versions to `0.3.0`.

## Validation performed here

- Parsed all JSON manifests successfully.
- Verified all relative source imports resolve to files.
- Type-checked the core/shared/ledger/provider sources.
- Type-checked web source and API source using local dependency type stubs because registry access was unavailable.
- Parsed CSS with no stylesheet parse errors and verified the HTML entry structure.
- Executed a compiled core lifecycle runtime check: Alice allowed → transfer to Bob → Alice denied → Bob claim decrements visits and advances version.

## Environment limitation

The execution environment could not reach the npm registry, so a real `npm install`, Vitest run, Vite production build, or Vercel CLI deployment could not be executed here. I did not fabricate a lockfile or claim those dependency-backed checks passed. Run `npm install && npm run check` once in a networked environment before merging/deploying.
