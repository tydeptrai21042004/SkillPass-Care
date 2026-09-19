import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  SkillPassError,
  type OwnerChallenge,
  type OwnerChallengePayload,
  type OwnerProof,
  type OwnerProofAction,
  type Principal,
  type ProviderId,
  type ServiceEventId
} from "@skillpass/shared";
import { hashCanonical } from "@skillpass/provider-sdk";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAYLOAD_KEYS = new Set([
  "version", "challengeId", "entitlementId", "providerId", "claimant",
  "action", "serviceEventId", "issuedAt", "expiresAt"
]);


export function issueOwnerChallenge(input: {
  entitlementId: string;
  providerId: ProviderId;
  claimant: Principal;
  action: OwnerProofAction;
  serviceEventId?: ServiceEventId;
  secret: string;
  ttlSeconds: number;
  now?: Date;
}): OwnerChallenge {
  if (input.action === "CLAIM" && !input.serviceEventId?.trim()) {
    throw new SkillPassError("VALIDATION_ERROR", "serviceEventId is required for claim challenges", 400);
  }
  if (input.action === "VERIFY" && input.serviceEventId?.trim()) {
    throw new SkillPassError("VALIDATION_ERROR", "serviceEventId is only valid for claim challenges", 400);
  }
  if (!Number.isInteger(input.ttlSeconds) || input.ttlSeconds < 30 || input.ttlSeconds > 600) {
    throw new SkillPassError("VALIDATION_ERROR", "challenge ttlSeconds must be between 30 and 600", 400);
  }
  const now = input.now ?? new Date();
  const payload: OwnerChallengePayload = {
    version: 1,
    challengeId: randomUUID(),
    entitlementId: input.entitlementId,
    providerId: input.providerId,
    claimant: input.claimant,
    action: input.action,
    serviceEventId: input.serviceEventId?.trim(),
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + input.ttlSeconds * 1000).toISOString()
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const token = `${encoded}.${sign(encoded, input.secret)}`;
  return { ...payload, message: canonicalOwnerChallengeMessage(payload), token };
}

export function verifyChallengeToken(token: string, secret: string, now = new Date()): OwnerChallenge {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) throw invalidChallenge();
  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!safeEqual(signature, sign(encoded, secret))) throw invalidChallenge();

  let payload: OwnerChallengePayload;
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    payload = parsePayload(JSON.parse(decoded));
  } catch {
    throw invalidChallenge();
  }
  const issuedAt = Date.parse(payload.issuedAt);
  const expiresAt = Date.parse(payload.expiresAt);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) throw invalidChallenge();
  if (issuedAt > now.getTime() + 30_000) throw invalidChallenge();
  if (expiresAt <= now.getTime()) {
    throw new SkillPassError("CHALLENGE_EXPIRED", "owner proof challenge has expired", 401);
  }
  if (expiresAt - issuedAt > 600_000) throw invalidChallenge();
  if (payload.action === "CLAIM" && !payload.serviceEventId) throw invalidChallenge();
  if (payload.action === "VERIFY" && payload.serviceEventId) throw invalidChallenge();
  return { ...payload, message: canonicalOwnerChallengeMessage(payload), token };
}

export function createPilotOwnerProof(challenge: OwnerChallenge, ownerSecret: string): OwnerProof {
  return {
    scheme: "HMAC-SHA256-PILOT",
    challengeId: challenge.challengeId,
    claimant: challenge.claimant,
    value: createHmac("sha256", deriveOwnerProofKey(ownerSecret)).update(challenge.message).digest("base64url")
  };
}

export function verifyPilotOwnerProof(challenge: OwnerChallenge, proof: OwnerProof, ownerSecret: string): void {
  if (proof.scheme !== "HMAC-SHA256-PILOT"
    || proof.challengeId !== challenge.challengeId
    || proof.claimant !== challenge.claimant) {
    throw new SkillPassError("OWNER_PROOF_INVALID", "owner proof does not match challenge", 401);
  }
  const expected = createHmac("sha256", deriveOwnerProofKey(ownerSecret)).update(challenge.message).digest("base64url");
  if (!safeEqual(proof.value, expected)) {
    throw new SkillPassError("OWNER_PROOF_INVALID", "owner proof signature is invalid", 401);
  }
}

export function ownerProofRequestHash(challenge: OwnerChallenge): string {
  return hashCanonical({
    version: 1,
    challengeId: challenge.challengeId,
    entitlementId: challenge.entitlementId,
    providerId: challenge.providerId,
    claimant: challenge.claimant,
    action: challenge.action,
    serviceEventId: challenge.serviceEventId ?? null,
    expiresAt: challenge.expiresAt
  });
}


export function claimRequestHash(challenge: OwnerChallenge): string {
  if (challenge.action !== "CLAIM" || !challenge.serviceEventId) {
    throw new SkillPassError("CHALLENGE_INVALID", "claim request hash requires a CLAIM challenge", 400);
  }
  return hashCanonical({
    version: 1,
    entitlementId: challenge.entitlementId,
    providerId: challenge.providerId,
    claimant: challenge.claimant,
    action: challenge.action,
    serviceEventId: challenge.serviceEventId
  });
}

export function canonicalOwnerChallengeMessage(payload: OwnerChallengePayload): string {
  return [
    "SKILLPASS_OWNER_PROOF_V1",
    `challengeId=${payload.challengeId}`,
    `action=${payload.action}`,
    `entitlementId=${payload.entitlementId}`,
    `providerId=${payload.providerId}`,
    `claimant=${payload.claimant}`,
    `serviceEventId=${payload.serviceEventId ?? ""}`,
    `issuedAt=${payload.issuedAt}`,
    `expiresAt=${payload.expiresAt}`
  ].join("\n");
}

function parsePayload(value: unknown): OwnerChallengePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalidChallenge();
  const data = value as Record<string, unknown>;
  if (Object.keys(data).some((key) => !PAYLOAD_KEYS.has(key))) throw invalidChallenge();
  if (data.version !== 1) throw invalidChallenge();
  if (typeof data.challengeId !== "string" || !UUID_RE.test(data.challengeId)) throw invalidChallenge();
  if (!boundedText(data.entitlementId, 256) || !boundedText(data.providerId, 128) || !boundedText(data.claimant, 256)) throw invalidChallenge();
  if (data.action !== "VERIFY" && data.action !== "CLAIM") throw invalidChallenge();
  if (data.serviceEventId !== undefined && !boundedText(data.serviceEventId, 256)) throw invalidChallenge();
  if (typeof data.issuedAt !== "string" || typeof data.expiresAt !== "string") throw invalidChallenge();
  return data as unknown as OwnerChallengePayload;
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function deriveOwnerProofKey(secret: string): Buffer {
  return createHmac("sha256", secret).update("SKILLPASS_OWNER_PROOF_KEY_V1").digest();
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function invalidChallenge(): SkillPassError {
  return new SkillPassError("CHALLENGE_INVALID", "owner proof challenge is invalid", 401);
}
