import type { CreateServiceRightInput, ServiceRight } from "@skillpass-care/core";
import {
  SkillPassError,
  type EntitlementId,
  type EntitlementStatus,
  type LedgerHealth,
  type ClaimMutationOptions,
  type LedgerListFilter,
  type MutationOptions,
  type Principal,
  type ProviderId,
  type ServiceEventListFilter,
  type ServiceEventRecord
} from "@skillpass-care/shared";
import type { ServiceRightLedger } from "./types.js";

/**
 * CKB integration boundary.
 *
 * This adapter intentionally fails closed for state mutations until the project
 * defines and deploys a versioned SkillPass type-script/data schema. A server
 * must never pretend that an in-memory ownership mutation is an on-chain one.
 */
export class CkbLedgerAdapter implements ServiceRightLedger {
  constructor(private readonly config: { rpcUrl: string; indexerUrl: string }) {}

  async health(): Promise<LedgerHealth> {
    try {
      const response = await fetch(this.config.rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: 1, jsonrpc: "2.0", method: "get_tip_header", params: [] }),
        signal: AbortSignal.timeout(5_000)
      });
      if (!response.ok) {
        return { mode: "ckb", ready: false, rpcReachable: false, detail: `CKB RPC HTTP ${response.status}` };
      }
      const body = (await response.json()) as { result?: unknown; error?: unknown };
      const rpcReachable = Boolean(body.result) && !body.error;
      return {
        mode: "ckb",
        ready: false,
        rpcReachable,
        detail: rpcReachable
          ? "CKB RPC reachable; SkillPass Cell schema/write adapter is intentionally not enabled yet"
          : "CKB RPC did not return a valid tip header"
      };
    } catch (error) {
      return {
        mode: "ckb",
        ready: false,
        rpcReachable: false,
        detail: error instanceof Error ? error.message : "CKB RPC unavailable"
      };
    }
  }

  async issue(_input: CreateServiceRightInput): Promise<ServiceRight> {
    return this.notImplemented("issue");
  }

  async get(_entitlementId: EntitlementId): Promise<ServiceRight | undefined> {
    return this.notImplemented("resolve live entitlement Cell");
  }

  async list(_filter?: LedgerListFilter): Promise<ServiceRight[]> {
    return this.notImplemented("list live entitlement Cells");
  }

  async transfer(
    _id: EntitlementId,
    _from: Principal,
    _to: Principal,
    _options: MutationOptions
  ): Promise<ServiceRight> {
    return this.notImplemented("wallet-signed CKB transfer");
  }

  async claim(
    _id: EntitlementId,
    _claimant: Principal,
    _providerId: ProviderId,
    _options: ClaimMutationOptions
  ): Promise<ServiceRight> {
    return this.notImplemented("durable claim transition");
  }

  async listServiceEvents(
    _entitlementId: EntitlementId,
    _filter?: ServiceEventListFilter
  ): Promise<ServiceEventRecord[]> {
    return this.notImplemented("list durable Care service events");
  }

  async setStatus(
    _id: EntitlementId,
    _issuerId: string,
    _status: EntitlementStatus,
    _options: MutationOptions
  ): Promise<ServiceRight> {
    return this.notImplemented("issuer-controlled status transition");
  }

  private notImplemented<T>(operation: string): Promise<T> {
    throw new SkillPassError(
      "NOT_IMPLEMENTED",
      `CKB mode is fail-closed: ${operation} requires the deployed SkillPass Cell schema and wallet transaction flow`,
      503
    );
  }
}
