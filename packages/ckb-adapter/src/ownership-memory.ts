import { createHash, randomBytes } from "node:crypto";
import type { SkillPassOwnershipSnapshot } from "@skillpass-care/core";
import { SkillPassError, type AuthorizationEvidence, type LedgerHealth } from "@skillpass-care/shared";
import type { SkillPassAuthorizationRequest, SkillPassOwnershipPort } from "./types.js";

/** Demo/test SkillPass ownership simulator. Uses CKB-shaped state refs and rotates them on transfer. */
export class InMemorySkillPassOwnership implements SkillPassOwnershipPort {
  private states = new Map<string, SkillPassOwnershipSnapshot>();
  private currentRefs = new Set<string>();
  async issueDemo(entitlementId:string, owner:string, transferable:boolean){const state={entitlementId,owner,stateRef:newStateRef(),transferable};this.states.set(entitlementId,state);this.currentRefs.add(state.stateRef);return structuredClone(state);}
  async resolve(id:string){const s=this.states.get(id);return s?structuredClone(s):undefined;}
  async authorize(request:SkillPassAuthorizationRequest):Promise<AuthorizationEvidence>{const s=this.states.get(request.entitlementId);const allowed=Boolean(s&&s.owner===request.claimant&&this.currentRefs.has(s.stateRef));const now=new Date();return{evidenceVersion:1,allowed,reason:!s?"NOT_FOUND":allowed?"ALLOW":"WRONG_OWNER",entitlementId:request.entitlementId,providerId:request.providerId,claimant:request.claimant,challengeId:request.challengeId,requestHash:request.requestHash,verifiedAt:now.toISOString(),expiresAt:new Date(now.getTime()+300000).toISOString(),stateRef:s?.stateRef};}
  async assertStateRefCurrent(ref:string){if(!this.currentRefs.has(ref))throw new SkillPassError("STATE_REF_STALE","SkillPass authorization stateRef is no longer live",409);}
  async transfer(id:string,from:string,to:string){const s=this.states.get(id);if(!s)throw new SkillPassError("NOT_FOUND","entitlement not found",404);if(s.owner!==from)throw new SkillPassError("FORBIDDEN","transfer actor is not current SkillPass owner",403);if(!s.transferable)throw new SkillPassError("FORBIDDEN","SkillPass capability is not transferable",403);this.currentRefs.delete(s.stateRef);const next={...s,owner:to,stateRef:newStateRef()};this.states.set(id,next);this.currentRefs.add(next.stateRef);return structuredClone(next);}
  async health():Promise<LedgerHealth>{return{mode:"memory",ready:true,detail:"in-memory SkillPass ownership simulator; no Care ownership database"};}
  async reset(){this.states.clear();this.currentRefs.clear();}
}
function newStateRef(){return `ckb:testnet:0x${randomBytes(32).toString("hex")}:0`;}
export function hashAuthorizationEvidence(e:AuthorizationEvidence){return `sha256:${createHash("sha256").update(JSON.stringify(e)).digest("hex")}`;}
