# Code Map

Start here if you are reviewing the repository.

| Question | File |
|---|---|
| What is a service right? | `packages/core/src/model.ts` |
| Why is a request allowed/denied? | `packages/core/src/policy.ts` |
| Where is current state stored? | `packages/ckb-adapter/src/types.ts` |
| How does the local demo behave? | `packages/ckb-adapter/src/memory.ts` |
| Where does real CKB code go? | `packages/ckb-adapter/src/ckb.ts` |
| What integrates into a provider? | `packages/provider-sdk/src/index.ts` |
| Where are HTTP endpoints? | `apps/api/src/app.ts` |
| Where is the pilot UI? | `apps/web/src/App.tsx` |
| How is the full lifecycle tested? | `apps/api/test/app.test.ts` |

## Review order

Recommended order: `PRODUCT_SPEC.md` → `ARCHITECTURE.md` → `core` → `ckb-adapter` → `provider-sdk` → API tests → UI.
