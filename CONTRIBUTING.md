# Contributing

## Design rules

1. Keep blockchain-specific code inside `packages/ckb-adapter`.
2. Keep provider authorization policy pure and testable.
3. Do not put customer PII into the entitlement object.
4. Do not add a feature unless it supports a pilot hypothesis or a production requirement.
5. Add a test for every authorization or transfer invariant.

## Pull request checklist

- [ ] TypeScript changes are typed.
- [ ] Authorization changes include tests.
- [ ] Documentation reflects public behavior.
- [ ] Demo-only behavior is clearly marked.
- [ ] New on-chain assumptions are documented in `docs/ARCHITECTURE.md`.
