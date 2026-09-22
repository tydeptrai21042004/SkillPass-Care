import { SkillPassError, type AuthorizationEvidence, type LedgerHealth } from "@skillpass-care/shared";
import type { SkillPassOwnershipSnapshot } from "@skillpass-care/core";
import type { SkillPassAuthorizationRequest, SkillPassOwnershipPort } from "./types.js";

export interface CanonicalSkillPassVerifierBinding {
  resolve(entitlementId: string): Promise<SkillPassOwnershipSnapshot | undefined>;
  verify(request: SkillPassAuthorizationRequest): Promise<AuthorizationEvidence>;
  isStateRefLive(stateRef: string): Promise<boolean>;
  health?(): Promise<{ ready: boolean; detail?: string }>;
}

/**
 * Production integration boundary for the main SkillPass verifier package.
 * The binding must return the exact live Cell outpoint as stateRef; Care never
 * synthesizes or versions ownership references locally.
 */
export class CanonicalSkillPassOwnership implements SkillPassOwnershipPort {
  constructor(private readonly binding: CanonicalSkillPassVerifierBinding) {}
  async resolve(id:string){const state=await this.binding.resolve(id);if(state)requireCkbStateRef(state.stateRef);return state;}
  async authorize(request:SkillPassAuthorizationRequest){const evidence=await this.binding.verify(request);if(evidence.allowed){if(!evidence.stateRef)throw new SkillPassError("LEDGER_UNAVAILABLE","canonical SkillPass verifier allowed request without stateRef",503);requireCkbStateRef(evidence.stateRef);}return evidence;}
  async assertStateRefCurrent(ref:string){requireCkbStateRef(ref);if(!(await this.binding.isStateRefLive(ref)))throw new SkillPassError("STATE_REF_STALE","SkillPass Cell stateRef is no longer live",409);}
  async health():Promise<LedgerHealth>{const h=await this.binding.health?.();return{mode:"ckb",ready:h?.ready??true,detail:h?.detail??"canonical SkillPass verifier binding"};}
}
export function requireCkbStateRef(ref:string){if(!/^ckb:(testnet|mainnet):0x[0-9a-fA-F]{64}:[0-9]+$/.test(ref))throw new SkillPassError("LEDGER_UNAVAILABLE","SkillPass stateRef must be a canonical CKB outpoint",503);return ref;}
