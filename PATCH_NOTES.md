# SkillPass Care v0.5.0 patch

This patch deliberately strengthens **SkillPass Care as a product**, rather than turning it into a thin copy of the main SkillPass protocol.

## Product / domain

- Added reference Care plans and allowed service types.
- Added typed service events with auditable before/after entitlement versions.
- Coverage can be consumed before resale and continued after resale.
- Added multi-unit service consumption with quota enforcement.
- Preserved issuer status controls, provider allow-lists, expiry and remaining coverage.

## Security

- Owner proof now binds service type and units as well as provider, entitlement, claimant and service event ID.
- Added stale pre-transfer service-proof rejection coverage.
- Exact retries remain idempotent; changed service details conflict.
- Added actor-scoped service-history access.

## Funding / architecture

- Workspace packages now use the `@skillpass-care/*` namespace.
- Added an explicit SkillPass-vs-Care integration boundary.
- Documented the target two-layer architecture: SkillPass owns portable ownership; Care owns mutable coverage/service state.
- Marked the old full-Care-on-CKB JSON payload as a legacy prototype, not the final target schema.
- Public demo now shows: Alice service -> transfer -> Alice denied -> Bob service at a different provider.

## Release hygiene

- Added `.env.example`, `.gitignore`, `.dockerignore`, CI, and dependency-free Care boundary verification.
- Removed conflicting `api/index.ts` and `api/[...path].ts` entrypoints.
- Bumped all workspace packages to `0.5.0`.
