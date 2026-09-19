import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { evaluateAuthorization } from "@skillpass/core";
import type { ServiceRightLedger } from "@skillpass/ckb-adapter";
import type {
  AuthorizationEvidence,
  EntitlementId,
  EvidenceSignature,
  Principal,
  ProviderId
} from "@skillpass/shared";

export type EvidenceSigner = (canonicalEvidence: string) => EvidenceSignature;

export interface ProviderVerifierOptions {
  providerId: ProviderId;
  ledger: ServiceRightLedger;
  evidenceSigner?: EvidenceSigner;
  evidenceTtlMs?: number;
}

export interface ProviderVerifyInput {
  entitlementId: EntitlementId;
  claimant: Principal;
  challengeId?: string;
  /** When supplied by the API, binds evidence to the exact owner-proof request. */
  requestHash?: string;
}

/** Provider-side verifier. Provider identity is fixed when the verifier is constructed. */
export class ProviderVerifier {
  constructor(private readonly options: ProviderVerifierOptions) {}

  async verify(input: ProviderVerifyInput): Promise<AuthorizationEvidence> {
    const right = await this.options.ledger.get(input.entitlementId);
    const decision = evaluateAuthorization(right, {
      entitlementId: input.entitlementId,
      providerId: this.options.providerId,
      claimant: input.claimant
    });
    const verifiedAtDate = new Date();
    const expiresAtDate = new Date(verifiedAtDate.getTime() + (this.options.evidenceTtlMs ?? 5 * 60_000));
    const requestHash = input.requestHash ?? hashCanonical({
      version: 1,
      entitlementId: input.entitlementId,
      providerId: this.options.providerId,
      claimant: input.claimant,
      challengeId: input.challengeId ?? null,
      entitlementVersion: decision.entitlementVersion ?? null
    });

    const evidence: AuthorizationEvidence = {
      ...decision,
      evidenceVersion: 1,
      entitlementId: input.entitlementId,
      providerId: this.options.providerId,
      claimant: input.claimant,
      challengeId: input.challengeId,
      requestHash,
      verifiedAt: verifiedAtDate.toISOString(),
      expiresAt: expiresAtDate.toISOString(),
      stateRef: decision.entitlementVersion === undefined
        ? undefined
        : `entitlement:${input.entitlementId}:v${decision.entitlementVersion}`
    };

    if (this.options.evidenceSigner) {
      evidence.signature = this.options.evidenceSigner(canonicalizeAuthorizationEvidence(evidence));
    }
    return evidence;
  }
}

export function createHmacEvidenceSigner(keyId: string, secret: string): EvidenceSigner {
  const normalized = secret.trim();
  if (!normalized) throw new Error("evidence signing secret must not be empty");
  return (canonicalEvidence) => ({
    scheme: "HMAC-SHA256-PILOT",
    keyId,
    value: createHmac("sha256", deriveEvidenceKey(normalized)).update(canonicalEvidence).digest("base64url")
  });
}

export function verifyHmacAuthorizationEvidence(evidence: AuthorizationEvidence, secret: string): boolean {
  if (!evidence.signature || evidence.signature.scheme !== "HMAC-SHA256-PILOT") return false;
  const unsigned: AuthorizationEvidence = { ...evidence, signature: undefined };
  delete unsigned.signature;
  const expected = createHmac("sha256", deriveEvidenceKey(secret.trim()))
    .update(canonicalizeAuthorizationEvidence(unsigned))
    .digest("base64url");
  return safeEqual(expected, evidence.signature.value);
}

export function canonicalizeAuthorizationEvidence(evidence: AuthorizationEvidence): string {
  return JSON.stringify({
    evidenceVersion: evidence.evidenceVersion,
    allowed: evidence.allowed,
    reason: evidence.reason,
    entitlementVersion: evidence.entitlementVersion ?? null,
    entitlementId: evidence.entitlementId,
    providerId: evidence.providerId,
    claimant: evidence.claimant,
    challengeId: evidence.challengeId ?? null,
    requestHash: evidence.requestHash,
    verifiedAt: evidence.verifiedAt,
    expiresAt: evidence.expiresAt,
    stateRef: evidence.stateRef ?? null
  });
}

export function hashCanonical(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function deriveEvidenceKey(secret: string): Buffer {
  return createHmac("sha256", secret).update("SKILLPASS_PROVIDER_EVIDENCE_KEY_V1").digest();
}

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
