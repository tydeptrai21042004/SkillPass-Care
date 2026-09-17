const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export interface ServiceRight {
  id: string;
  issuerId: string;
  productHash: string;
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

async function json<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${url}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options?.headers ?? {}) }
  });
  const body = await response.json();
  if (!response.ok) {
    const message = body?.error?.message ?? body?.error ?? `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export const client = {
  list: () => json<ServiceRight[]>("/entitlements"),
  reset: () => json<ServiceRight>("/demo/reset", { method: "POST" }),
  transfer: (id: string, from: string, to: string, expectedVersion?: number) =>
    json<ServiceRight>(`/demo/entitlements/${id}/transfer`, {
      method: "POST",
      body: JSON.stringify({ from, to, expectedVersion })
    }),
  verify: (id: string, providerId: string, claimant: string) =>
    json<VerificationEvidence>(`/demo/entitlements/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({ providerId, claimant })
    }),
  claim: (id: string, providerId: string, claimant: string, expectedVersion?: number) =>
    json<ServiceRight>(`/demo/entitlements/${id}/claim`, {
      method: "POST",
      body: JSON.stringify({ providerId, claimant, expectedVersion })
    })
};
