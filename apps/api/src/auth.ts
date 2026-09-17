import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { SkillPassError } from "@skillpass/shared";

export interface CredentialRegistry {
  issuers: Record<string, string>;
  providers: Record<string, string>;
  owners: Record<string, string>;
}

export type ActorType = "issuer" | "provider" | "owner";

const headers: Record<ActorType, { id: string; key: string }> = {
  issuer: { id: "x-issuer-id", key: "x-issuer-key" },
  provider: { id: "x-provider-id", key: "x-provider-key" },
  owner: { id: "x-owner-id", key: "x-owner-key" }
};

export function authenticate(req: Request, type: ActorType, registry: CredentialRegistry): string {
  const result = tryAuthenticate(req, type, registry);
  if (!result) {
    const config = headers[type];
    throw new SkillPassError(
      "AUTHENTICATION_REQUIRED",
      `${config.id} and ${config.key} are required and must be valid`,
      401
    );
  }
  return result;
}

export function authenticateAny(
  req: Request,
  types: ActorType[],
  registry: CredentialRegistry
): { type: ActorType; id: string } {
  for (const type of types) {
    const id = tryAuthenticate(req, type, registry);
    if (id) return { type, id };
  }
  throw new SkillPassError("AUTHENTICATION_REQUIRED", "valid actor credentials are required", 401);
}

function tryAuthenticate(req: Request, type: ActorType, registry: CredentialRegistry): string | undefined {
  const config = headers[type];
  const id = header(req, config.id);
  const key = header(req, config.key);
  if (!id || !key) return undefined;
  const stores: Record<ActorType, Record<string, string>> = {
    issuer: registry.issuers,
    provider: registry.providers,
    owner: registry.owners
  };
  const expected = stores[type][id];
  if (!expected || !safeEqual(key, expected)) return undefined;
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
