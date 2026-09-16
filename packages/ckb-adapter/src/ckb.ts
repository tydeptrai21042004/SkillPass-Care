import type { CreateServiceRightInput, ServiceRight } from "@skillpass/core";
import type { EntitlementId, Principal, ProviderId } from "@skillpass/shared";
import type { ServiceRightLedger } from "./types.js";

/**
 * Production/testnet integration boundary.
 *
 * Implement these methods with CCC + CKB RPC/indexer. Keeping this class in
 * the tree makes missing blockchain work explicit instead of hiding it inside
 * a mock API.
 */
export class CkbLedgerAdapter implements ServiceRightLedger {
  constructor(
    private readonly config: { rpcUrl: string; indexerUrl: string }
  ) {}

  async issue(_input: CreateServiceRightInput): Promise<ServiceRight> {
    throw new Error(`CKB adapter TODO: issue via CCC against ${this.config.rpcUrl}`);
  }

  async get(_entitlementId: EntitlementId): Promise<ServiceRight | undefined> {
    throw new Error("CKB adapter TODO: resolve canonical live entitlement Cell");
  }

  async list(): Promise<ServiceRight[]> {
    throw new Error("CKB adapter TODO: query live entitlement Cells");
  }

  async transfer(_id: EntitlementId, _from: Principal, _to: Principal): Promise<ServiceRight> {
    throw new Error("CKB adapter TODO: consume current Cell and create new-owner Cell");
  }

  async claim(_id: EntitlementId, _claimant: Principal, _providerId: ProviderId): Promise<ServiceRight> {
    throw new Error("CKB adapter TODO: define durable claim transition/audit strategy");
  }
}
