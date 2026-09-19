import type { ServiceRight } from "@skillpass/core";
import { SERVICE_RIGHT_SCHEMA_VERSION } from "@skillpass/core";
import { SkillPassError, type EntitlementStatus, type ProviderId } from "@skillpass/shared";

/**
 * Canonical V1 payload intended for CKB Cell data.
 * The owner is intentionally absent: in CKB mode ownership MUST come from Cell.lock.
 */
export interface CkbServiceRightDataV1 {
  schemaVersion: 1;
  id: string;
  issuerId: string;
  productCommitment: string;
  serviceClass: string;
  remainingClaims: number;
  expiresAt: string;
  transferable: boolean;
  acceptedProviderIds: ProviderId[];
  status: EntitlementStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function toCkbServiceRightData(right: ServiceRight): CkbServiceRightDataV1 {
  if (right.schemaVersion !== SERVICE_RIGHT_SCHEMA_VERSION) {
    throw new SkillPassError("VALIDATION_ERROR", `unsupported ServiceRight schemaVersion: ${right.schemaVersion}`, 400);
  }
  return {
    schemaVersion: 1,
    id: right.id,
    issuerId: right.issuerId,
    productCommitment: right.productCommitment,
    serviceClass: right.serviceClass,
    remainingClaims: right.remainingClaims,
    expiresAt: right.expiresAt,
    transferable: right.transferable,
    acceptedProviderIds: [...right.acceptedProviderIds],
    status: right.status,
    version: right.version,
    createdAt: right.createdAt,
    updatedAt: right.updatedAt
  };
}

/** Deterministic JSON bytes for the V1 prototype schema. Replace with Molecule before mainnet deployment. */
export function encodeCkbServiceRightData(data: CkbServiceRightDataV1): Uint8Array {
  validateData(data);
  const canonical = JSON.stringify({
    schemaVersion: data.schemaVersion,
    id: data.id,
    issuerId: data.issuerId,
    productCommitment: data.productCommitment,
    serviceClass: data.serviceClass,
    remainingClaims: data.remainingClaims,
    expiresAt: data.expiresAt,
    transferable: data.transferable,
    acceptedProviderIds: data.acceptedProviderIds,
    status: data.status,
    version: data.version,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  });
  return new TextEncoder().encode(canonical);
}

export function decodeCkbServiceRightData(bytes: Uint8Array): CkbServiceRightDataV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new SkillPassError("VALIDATION_ERROR", "invalid SkillPass Cell data encoding", 400);
  }
  validateData(parsed);
  return parsed;
}

function validateData(value: unknown): asserts value is CkbServiceRightDataV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  const data = value as Record<string, unknown>;
  const allowed = new Set([
    "schemaVersion", "id", "issuerId", "productCommitment", "serviceClass",
    "remainingClaims", "expiresAt", "transferable", "acceptedProviderIds",
    "status", "version", "createdAt", "updatedAt"
  ]);
  if (Object.keys(data).some((key) => !allowed.has(key))) invalid("unknown field in SkillPass Cell data");
  if (data.schemaVersion !== 1) invalid("unsupported SkillPass Cell schemaVersion");
  if (!text(data.id, 256)) invalid("id is required");
  if (!text(data.issuerId, 256)) invalid("issuerId is required");
  if (typeof data.productCommitment !== "string" || !/^sha256:[0-9a-f]{64}$/.test(data.productCommitment)) {
    invalid("productCommitment must be canonical lowercase sha256:<64 hex>");
  }
  if (!text(data.serviceClass, 128)) invalid("serviceClass is required");
  if (typeof data.remainingClaims !== "number" || !Number.isSafeInteger(data.remainingClaims) || data.remainingClaims < 0 || data.remainingClaims > 10_000) {
    invalid("remainingClaims is invalid");
  }
  if (typeof data.version !== "number" || !Number.isSafeInteger(data.version) || data.version < 1) invalid("version is invalid");
  if (typeof data.transferable !== "boolean") invalid("transferable is invalid");
  if (!Array.isArray(data.acceptedProviderIds) || data.acceptedProviderIds.length === 0 || data.acceptedProviderIds.length > 100 || data.acceptedProviderIds.some((x) => !text(x, 128))) {
    invalid("acceptedProviderIds is invalid");
  }
  const providers = data.acceptedProviderIds as string[];
  if (new Set(providers).size !== providers.length) invalid("acceptedProviderIds must be unique");
  if (providers.some((value, index) => index > 0 && providers[index - 1] > value)) invalid("acceptedProviderIds must be sorted");
  if (!(data.status === "ACTIVE" || data.status === "SUSPENDED" || data.status === "REVOKED")) invalid("status is invalid");
  if (!canonicalIso(data.expiresAt)) invalid("expiresAt must be canonical ISO-8601 UTC");
  if (!canonicalIso(data.createdAt)) invalid("createdAt must be canonical ISO-8601 UTC");
  if (!canonicalIso(data.updatedAt)) invalid("updatedAt must be canonical ISO-8601 UTC");
}

function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function canonicalIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString() === value;
}

function invalid(message = "invalid SkillPass Cell data"): never {
  throw new SkillPassError("VALIDATION_ERROR", message, 400);
}
