import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { evaluateCareAuthorization } from "@skillpass-care/core";
import type { ServiceRightLedger, SkillPassOwnershipPort } from "@skillpass-care/ckb-adapter";
import type { AuthorizationEvidence, EntitlementId, EvidenceSignature, Principal, ProviderId } from "@skillpass-care/shared";

export type EvidenceSigner = (canonicalEvidence: string) => EvidenceSignature;
export interface ProviderVerifierOptions { providerId: ProviderId; ledger: ServiceRightLedger; evidenceSigner?: EvidenceSigner; evidenceTtlMs?: number; }
export interface ProviderVerifyInput { entitlementId: EntitlementId; claimant: Principal; challengeId?: string; requestHash?: string; }

/** Provider verification is ownership-first: canonical SkillPass verifies the live Cell, then Care policy is applied. */
export class ProviderVerifier {
  constructor(private readonly options: ProviderVerifierOptions) {}
  async verify(input: ProviderVerifyInput): Promise<AuthorizationEvidence> {
    const requestHash=input.requestHash??hashCanonical({version:2,entitlementId:input.entitlementId,providerId:this.options.providerId,claimant:input.claimant,challengeId:input.challengeId??null});
    const ownershipPort: SkillPassOwnershipPort | undefined=this.options.ledger.ownership;
    if(!ownershipPort) throw new Error("ProviderVerifier requires ledger.ownership SkillPassOwnershipPort");
    const [ownership, right]=await Promise.all([ownershipPort.resolve(input.entitlementId),this.options.ledger.get(input.entitlementId)]);
    const skillpassEvidence=await ownershipPort.authorize({entitlementId:input.entitlementId,providerId:this.options.providerId,claimant:input.claimant,challengeId:input.challengeId,requestHash});
    const careDecision=right&&ownership?evaluateCareAuthorization(right,ownership,{entitlementId:input.entitlementId,providerId:this.options.providerId,claimant:input.claimant}):{allowed:false as const,reason:"NOT_FOUND" as const};
    const allowed=skillpassEvidence.allowed&&careDecision.allowed;
    const now=new Date();
    const evidence:AuthorizationEvidence={...careDecision,allowed,reason:skillpassEvidence.allowed?careDecision.reason:skillpassEvidence.reason,evidenceVersion:1,entitlementId:input.entitlementId,providerId:this.options.providerId,claimant:input.claimant,challengeId:input.challengeId,requestHash,verifiedAt:now.toISOString(),expiresAt:new Date(now.getTime()+(this.options.evidenceTtlMs??300000)).toISOString(),stateRef:skillpassEvidence.stateRef};
    if(this.options.evidenceSigner)evidence.signature=this.options.evidenceSigner(canonicalizeAuthorizationEvidence(evidence));
    return evidence;
  }
}
export function createHmacEvidenceSigner(keyId:string,secret:string):EvidenceSigner{const normalized=secret.trim();if(!normalized)throw new Error("evidence signing secret must not be empty");return canonicalEvidence=>({scheme:"HMAC-SHA256-PILOT",keyId,value:createHmac("sha256",deriveEvidenceKey(normalized)).update(canonicalEvidence).digest("base64url")});}
export function verifyHmacAuthorizationEvidence(evidence:AuthorizationEvidence,secret:string){if(!evidence.signature||evidence.signature.scheme!=="HMAC-SHA256-PILOT")return false;const unsigned={...evidence} as AuthorizationEvidence;delete unsigned.signature;const expected=createHmac("sha256",deriveEvidenceKey(secret.trim())).update(canonicalizeAuthorizationEvidence(unsigned)).digest("base64url");return safeEqual(expected,evidence.signature.value);}
export function canonicalizeAuthorizationEvidence(evidence:AuthorizationEvidence){return JSON.stringify({evidenceVersion:evidence.evidenceVersion,allowed:evidence.allowed,reason:evidence.reason,entitlementVersion:evidence.entitlementVersion??null,entitlementId:evidence.entitlementId,providerId:evidence.providerId,claimant:evidence.claimant,challengeId:evidence.challengeId??null,requestHash:evidence.requestHash,verifiedAt:evidence.verifiedAt,expiresAt:evidence.expiresAt,stateRef:evidence.stateRef??null});}
export function hashCanonical(value:unknown){return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;}
function deriveEvidenceKey(secret:string){return createHmac("sha256",secret).update("SKILLPASS_PROVIDER_EVIDENCE_KEY_V1").digest();}
function safeEqual(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
