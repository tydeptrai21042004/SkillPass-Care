import { InMemoryLedger } from "@skillpass-care/ckb-adapter";
import { ProviderVerifier } from "@skillpass-care/provider-sdk";

/**
 * Independent Provider B example. In the real pilot, Provider B supplies its
 * own policy/credentials and canonical SkillPass resolver; it does not trust a
 * Provider A ownership database.
 */
const ledger = new InMemoryLedger();
const right = await ledger.resetDemo();
await ledger.transfer(right.id, "alice", "bob", { expectedVersion: 1 });

const verifier = new ProviderVerifier({ providerId: "repair-b", ledger });
console.log(await verifier.verify({ entitlementId: right.id, claimant: "bob" }));
