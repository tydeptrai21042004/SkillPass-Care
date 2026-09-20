import { InMemoryLedger } from "@skillpass-care/ckb-adapter";
import { ProviderVerifier } from "@skillpass-care/provider-sdk";

/**
 * Minimal example showing what Repair Shop A actually needs.
 * It does not read an issuer customer table; it independently resolves the
 * entitlement through the ledger abstraction.
 */
const ledger = new InMemoryLedger();
const right = await ledger.resetDemo();
const verifier = new ProviderVerifier({ providerId: "repair-a", ledger });

console.log(await verifier.verify({ entitlementId: right.id, claimant: "alice" }));
