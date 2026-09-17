import { evaluateAuthorization } from "@skillpass/core";
import type { ServiceRightLedger } from "@skillpass/ckb-adapter";
import type { AuthorizationEvidence, EntitlementId, Principal, ProviderId } from "@skillpass/shared";

/** Provider-side verifier. Provider identity is fixed when the verifier is constructed. */
export class ProviderVerifier {
  constructor(private readonly options: { providerId: ProviderId; ledger: ServiceRightLedger }) {}

  async verify(input: { entitlementId: EntitlementId; claimant: Principal }): Promise<AuthorizationEvidence> {
    const right = await this.options.ledger.get(input.entitlementId);
    const decision = evaluateAuthorization(right, {
      entitlementId: input.entitlementId,
      providerId: this.options.providerId,
      claimant: input.claimant
    });
    return {
      ...decision,
      entitlementId: input.entitlementId,
      providerId: this.options.providerId,
      claimant: input.claimant,
      verifiedAt: new Date().toISOString()
    };
  }
}
