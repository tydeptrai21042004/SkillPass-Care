import { evaluateAuthorization } from "@skillpass/core";
import type { ServiceRightLedger } from "@skillpass/ckb-adapter";
import type { AuthorizationDecision, EntitlementId, Principal, ProviderId } from "@skillpass/shared";

/**
 * Small integration surface for independent providers.
 * The provider supplies its own identity and a ledger resolver.
 */
export class ProviderVerifier {
  constructor(private readonly options: { providerId: ProviderId; ledger: ServiceRightLedger }) {}

  async verify(input: { entitlementId: EntitlementId; claimant: Principal }): Promise<AuthorizationDecision> {
    const right = await this.options.ledger.get(input.entitlementId);
    return evaluateAuthorization(right, {
      entitlementId: input.entitlementId,
      providerId: this.options.providerId,
      claimant: input.claimant
    });
  }
}
