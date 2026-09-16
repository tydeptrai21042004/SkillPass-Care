const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export interface ServiceRight {
  id: string;
  productHash: string;
  owner: string;
  serviceClass: string;
  remainingClaims: number;
  expiresAt: string;
  transferable: boolean;
  acceptedProviderIds: string[];
  version: number;
}

async function json<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${url}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options?.headers ?? {}) }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body;
}

export const client = {
  list: () => json<ServiceRight[]>("/entitlements"),
  reset: () => json<ServiceRight>("/demo/reset", { method: "POST" }),
  transfer: (id: string, from: string, to: string) => json<ServiceRight>(`/entitlements/${id}/transfer`, { method: "POST", body: JSON.stringify({ from, to }) }),
  verify: (id: string, providerId: string, claimant: string) => json<{allowed:boolean;reason:string;entitlementVersion?:number}>(`/entitlements/${id}/verify`, { method: "POST", body: JSON.stringify({ providerId, claimant }) }),
  claim: (id: string, providerId: string, claimant: string) => json<ServiceRight>(`/entitlements/${id}/claim`, { method: "POST", body: JSON.stringify({ providerId, claimant }) })
};
