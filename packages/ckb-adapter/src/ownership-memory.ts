import { createHash, randomBytes } from "node:crypto";
import type { SkillPassOwnershipSnapshot } from "@skillpass-care/core";
import { SkillPassError, type AuthorizationEvidence, type LedgerHealth } from "@skillpass-care/shared";
import type { SkillPassAuthorizationRequest, SkillPassOwnershipPort } from "./types.js";

/** Demo/test SkillPass ownership simulator. Uses CKB-shaped state refs and rotates them on transfer. */
export class InMemorySkillPassOwnership implements SkillPassOwnershipPort {
  private states = new Map<string, SkillPassOwnershipSnapshot>();
  private currentRefs = new Set<string>();

  async issueDemo(entitlementId: string, owner: string, transferable: boolean) {
    if (this.states.has(entitlementId)) throw new SkillPassError("VERSION_CONFLICT", "SkillPass entitlement already exists", 409);
    const state = { entitlementId, owner, stateRef: newStateRef(), transferable };
    this.states.set(entitlementId, state);
    this.currentRefs.add(state.stateRef);
    return structuredClone(state);
  }

  async resolve(id: string) {
    const state = this.states.get(id);
    return state ? structuredClone(state) : undefined;
  }

  async authorize(request: SkillPassAuthorizationRequest): Promise<AuthorizationEvidence> {
    const state = this.states.get(request.entitlementId);
    const allowed = Boolean(state && state.owner === request.claimant && this.currentRefs.has(state.stateRef));
    const now = new Date();
    return {
      evidenceVersion: 1,
      allowed,
      reason: !state ? "NOT_FOUND" : allowed ? "ALLOW" : "WRONG_OWNER",
      entitlementId: request.entitlementId,
      providerId: request.providerId,
      claimant: request.claimant,
      challengeId: request.challengeId,
      requestHash: request.requestHash,
      verifiedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 300_000).toISOString(),
      stateRef: state?.stateRef
    };
  }

  async assertStateRefCurrent(ref: string) {
    if (!this.currentRefs.has(ref)) {
      throw new SkillPassError("STATE_REF_STALE", "SkillPass authorization stateRef is no longer live", 409);
    }
  }

  async transfer(id: string, from: string, to: string) {
    const state = this.states.get(id);
    if (!state) throw new SkillPassError("NOT_FOUND", "entitlement not found", 404);
    if (state.owner !== from) throw new SkillPassError("FORBIDDEN", "transfer actor is not current SkillPass owner", 403);
    if (!state.transferable) throw new SkillPassError("FORBIDDEN", "SkillPass capability is not transferable", 403);
    if (!to.trim() || to === from) throw new SkillPassError("VALIDATION_ERROR", "new owner must be different", 400);
    this.currentRefs.delete(state.stateRef);
    const next = { ...state, owner: to.trim(), stateRef: newStateRef() };
    this.states.set(id, next);
    this.currentRefs.add(next.stateRef);
    return structuredClone(next);
  }

  async health(): Promise<LedgerHealth> {
    return {
      mode: "memory",
      ownershipMode: "memory",
      ready: true,
      detail: "in-memory SkillPass ownership simulator; no Care ownership database"
    };
  }

  async reset() {
    this.states.clear();
    this.currentRefs.clear();
  }
}

function newStateRef() {
  return `ckb:testnet:0x${randomBytes(32).toString("hex")}:0`;
}

export function hashAuthorizationEvidence(evidence: AuthorizationEvidence) {
  return `sha256:${createHash("sha256").update(canonical(evidence)).digest("hex")}`;
}

function canonical(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}
