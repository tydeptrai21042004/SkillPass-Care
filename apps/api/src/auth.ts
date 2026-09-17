import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { SkillPassError } from "@skillpass/shared";

export interface CredentialRegistry {
  issuers: Record<string, string>;
  providers: Record<string, string>;
  owners: Record<string, string>;
}

type ActorType = "issuer" | "provider" | "owner";

const headers: Record<ActorType, { id: string; key: string }> = {
  issuer: { id: "x-issuer-id", key: "x-issuer-key" },
  provider: { id: "x-provider-id", key: "x-provider-key" },
  owner: { id: "x-owner-id", key: "x-owner-key" }
};

export function authenticate(req: Request, type: ActorType, registry: CredentialRegistry): string {
  const config = headers[type];
  const id = header(req, config.id);
  const key = header(req, config.key);
  if (!id || !key) {
    throw new SkillPassError(
      "AUTHENTICATION_REQUIRED",
      `${config.id} and ${config.key} are required`,
      401
    );
  }
  const stores: Record<ActorType, Record<string, string>> = {
    issuer: registry.issuers,
    provider: registry.providers,
    owner: registry.owners
  };
  const expected = stores[type][id];
  if (!expected || !safeEqual(key, expected)) {
    throw new SkillPassError("AUTHENTICATION_REQUIRED", `invalid ${type} credentials`, 401);
  }
  return id;
}

function header(req: Request, name: string): string | undefined {
  const value = req.header(name)?.trim();
  return value || undefined;
}

function safeEqual(a: string, b: string): boolean {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);
  return aBytes.length === bBytes.length && timingSafeEqual(aBytes, bBytes);
}
