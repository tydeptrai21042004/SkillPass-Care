const configuredApi = import.meta.env.VITE_API_BASE_URL;
const API = (typeof configuredApi === "string" && configuredApi ? configuredApi : "/api").replace(/\/$/, "");

export interface ServiceRight {
  schemaVersion: 1;
  id: string;
  issuerId: string;
  productCommitment: string;
  owner: string;
  serviceClass: string;
  remainingClaims: number;
  expiresAt: string;
  transferable: boolean;
  acceptedProviderIds: string[];
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationEvidence {
  allowed: boolean;
  reason: string;
  entitlementVersion?: number;
  entitlementId: string;
  providerId: string;
  claimant: string;
  verifiedAt: string;
}

export interface ApiMeta {
  name: string;
  apiVersion: string;
  serviceRightSchemaVersion: number;
  ownerProof: string;
  ownerProofTtlSeconds: number;
  claimIdempotency: boolean;
  scopedReads: boolean;
  demoEnabled: boolean;
  demoRoute: string | null;
  ledgerMode: "memory" | "ckb";
  ledgerReady: boolean;
  ckbImplemented: boolean;
}

type ApiErrorShape = {
  error?: { message?: string; requestId?: string; code?: string } | string;
};

async function json<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${url}`, {
    ...options,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(options?.headers ?? {}) },
    signal: options?.signal ?? AbortSignal.timeout(10_000)
  });
  const text = await response.text();
  let body: unknown = undefined;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) {
    const shaped = body as ApiErrorShape | undefined;
    const detail = typeof shaped?.error === "object" ? shaped.error?.message : shaped?.error;
    throw new Error(detail || `Request failed with HTTP ${response.status}`);
  }
  return body as T;
}

export const client = {
  meta: () => json<ApiMeta>("/meta"),
  state: (route = "/demo/state") => json<ServiceRight>(route),
  reset: () => json<ServiceRight>("/demo/reset", { method: "POST", body: "{}" }),
  transfer: (id: string, from: string, to: string, expectedVersion?: number) =>
    json<ServiceRight>(`/demo/entitlements/${encodeURIComponent(id)}/transfer`, {
      method: "POST",
      body: JSON.stringify({ from, to, expectedVersion })
    }),
  verify: (id: string, providerId: string, claimant: string) =>
    json<VerificationEvidence>(`/demo/entitlements/${encodeURIComponent(id)}/verify`, {
      method: "POST",
      body: JSON.stringify({ providerId, claimant })
    }),
  claim: (id: string, providerId: string, claimant: string, expectedVersion?: number) =>
    json<ServiceRight>(`/demo/entitlements/${encodeURIComponent(id)}/claim`, {
      method: "POST",
      body: JSON.stringify({ providerId, claimant, expectedVersion })
    })
};
