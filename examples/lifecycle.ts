import { InMemoryLedger } from "@skillpass/ckb-adapter";
import { ProviderVerifier } from "@skillpass/provider-sdk";

const ledger = new InMemoryLedger();
const right = await ledger.resetDemo();
const providerA = new ProviderVerifier({ providerId: "repair-a", ledger });
const providerB = new ProviderVerifier({ providerId: "repair-b", ledger });

console.log("Alice before transfer", await providerA.verify({ entitlementId: right.id, claimant: "alice" }));
await ledger.transfer(right.id, "alice", "bob");
console.log("Alice after transfer", await providerA.verify({ entitlementId: right.id, claimant: "alice" }));
console.log("Bob at provider B", await providerB.verify({ entitlementId: right.id, claimant: "bob" }));
