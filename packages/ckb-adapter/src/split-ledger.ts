import { randomUUID } from "node:crypto";
import { composeServiceRight, type CreateServiceRightInput, type ServiceRight } from "@skillpass-care/core";
import { validateCreateCareCoverageInput, type CareCoverageStore } from "@skillpass-care/care-store";
import { SkillPassError, type AuthorizationEvidence, type ClaimMutationOptions, type EntitlementStatus, type LedgerHealth, type LedgerListFilter, type MutationOptions, type ServiceEventListFilter } from "@skillpass-care/shared";
import { hashAuthorizationEvidence } from "./ownership-memory.js";
import type { ServiceRightLedger, SkillPassOwnershipPort } from "./types.js";

export class SplitServiceRightLedger implements ServiceRightLedger {
  constructor(public readonly ownership: SkillPassOwnershipPort, public readonly care: CareCoverageStore) {}

  async issue(input: CreateServiceRightInput) {
    const id = input.id ?? `ent-${randomUUID()}`;
    // Validate Care state before touching either ownership or durable storage.
    validateCreateCareCoverageInput({ ...input, id });

    if (this.ownership.issueDemo) {
      const ownership = await this.ownership.issueDemo(id, input.owner, input.transferable);
      const coverage = await this.care.create({ ...input, id });
      return composeServiceRight(coverage, ownership);
    }

    // Canonical mode never self-issues a SkillPass right. The host/wallet first
    // creates the real Capability, then Care attaches application state to that
    // exact canonical entitlement identity.
    if (!input.id) {
      throw new SkillPassError("VALIDATION_ERROR", "canonical Care attachment requires the existing SkillPass entitlementId", 400);
    }
    const ownership = await this.ownership.resolve(id);
    if (!ownership) throw new SkillPassError("NOT_FOUND", "canonical SkillPass entitlement not found", 404);
    if (ownership.owner !== input.owner) {
      throw new SkillPassError("FORBIDDEN", "Care attachment owner does not match the current SkillPass owner", 403);
    }
    if (ownership.issuerId && ownership.issuerId !== input.issuerId) {
      throw new SkillPassError("FORBIDDEN", "Care issuer does not match the canonical SkillPass issuer", 403);
    }
    await this.ownership.assertStateRefCurrent(ownership.stateRef);
    const coverage = await this.care.create({ ...input, id });
    return composeServiceRight(coverage, ownership);
  }

  async get(id: string) {
    const [coverage, ownership] = await Promise.all([this.care.get(id), this.ownership.resolve(id)]);
    return coverage && ownership ? composeServiceRight(coverage, ownership) : undefined;
  }

  async list(filter: LedgerListFilter = {}) {
    const coverages = await this.care.list({ issuerId: filter.issuerId, providerId: filter.providerId });
    const out: ServiceRight[] = [];
    for (const coverage of coverages) {
      const ownership = await this.ownership.resolve(coverage.id);
      if (ownership && (!filter.owner || ownership.owner === filter.owner)) out.push(composeServiceRight(coverage, ownership));
    }
    return out;
  }

  async transfer(id: string, from: string, to: string, _options: MutationOptions) {
    if (!this.ownership.transfer) {
      throw new SkillPassError("NOT_IMPLEMENTED", "transfer must be submitted through SkillPass wallet/client", 503);
    }
    await this.ownership.transfer(id, from, to);
    const result = await this.get(id);
    if (!result) throw new SkillPassError("NOT_FOUND", "entitlement not found", 404);
    return result;
  }

  async claim(id: string, claimant: string, providerId: string, options: ClaimMutationOptions & { authorizationEvidence?: AuthorizationEvidence }) {
    const evidence = options.authorizationEvidence ?? await this.ownership.authorize({
      entitlementId: id,
      claimant,
      providerId,
      requestHash: options.requestHash
    });
    if (!evidence.allowed || !evidence.stateRef) {
      throw new SkillPassError("FORBIDDEN", `claim denied: ${evidence.reason}`, 403);
    }
    if (evidence.claimant !== claimant
      || evidence.providerId !== providerId
      || evidence.entitlementId !== id
      || evidence.requestHash !== options.requestHash) {
      throw new SkillPassError("FORBIDDEN", "authorization evidence is not bound to this Care request", 403);
    }
    const result = await this.care.consume(id, {
      claimant,
      providerId,
      authorizationStateRef: evidence.stateRef,
      authorizationEvidenceHash: hashAuthorizationEvidence(evidence),
      assertStateRefCurrent: (ref) => this.ownership.assertStateRefCurrent(ref)
    }, options);
    const owner = await this.ownership.resolve(id);
    if (!owner) throw new SkillPassError("STATE_REF_STALE", "SkillPass capability no longer resolves", 409);
    return composeServiceRight(result.coverage, owner);
  }

  async listServiceEvents(id: string, filter: ServiceEventListFilter = {}) {
    return this.care.listServiceEvents(id, filter);
  }

  async setStatus(id: string, issuerId: string, status: EntitlementStatus, options: MutationOptions) {
    const coverage = await this.care.setStatus(id, issuerId, status, options);
    const ownership = await this.ownership.resolve(id);
    if (!ownership) throw new SkillPassError("NOT_FOUND", "SkillPass capability not found", 404);
    return composeServiceRight(coverage, ownership);
  }

  async health(): Promise<LedgerHealth> {
    const [ownership, care] = await Promise.all([this.ownership.health(), this.care.health()]);
    const ownershipMode = ownership.ownershipMode ?? (ownership.mode === "ckb" ? "ckb" : "memory");
    const careStoreMode = care.careStoreMode ?? (care.mode === "postgres" ? "postgres" : "memory");
    return {
      mode: ownershipMode === "ckb" ? "ckb" : careStoreMode,
      ownershipMode,
      careStoreMode,
      ready: ownership.ready && care.ready,
      detail: `ownership=${ownership.detail}; care=${care.detail}`,
      rpcReachable: ownership.rpcReachable
    };
  }

  async resetDemo() {
    await this.ownership.reset?.();
    await this.care.reset?.();
    return this.issue({
      issuerId: "seller-demo",
      productCommitment: "sha256:42f4dc06f496e6209f50c0849c4fb14d0b2a4f752d636a28bb7e091ea462863c",
      owner: "alice",
      serviceClass: "STANDARD_90D",
      remainingClaims: 3,
      expiresAt: "2099-12-31T23:59:59.000Z",
      transferable: true,
      acceptedProviderIds: ["repair-a", "repair-b"]
    });
  }
}
