import { createHmac, timingSafeEqual } from "node:crypto";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import {
  claimServiceRight,
  evaluateAuthorization,
  transferServiceRight,
  type ServiceRight
} from "@skillpass/core";
import { SkillPassError } from "@skillpass/shared";

const COOKIE_NAME = "skillpass_demo";
const DEFAULT_DEMO_SECRET = "skillpass-care-public-demo-v1-not-a-security-boundary";

const demoRightSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1).max(256),
  issuerId: z.string().min(1).max(256),
  productCommitment: z.string().min(1).max(512),
  owner: z.string().min(1).max(256),
  serviceClass: z.string().min(1).max(128),
  remainingClaims: z.number().int().min(0).max(10_000),
  expiresAt: z.string().datetime(),
  transferable: z.boolean(),
  acceptedProviderIds: z.array(z.string().min(1).max(128)).min(1).max(100),
  status: z.enum(["ACTIVE", "SUSPENDED", "REVOKED"]),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).strict();

const transferSchema = z.object({
  from: z.string().trim().min(1).max(256),
  to: z.string().trim().min(1).max(256),
  expectedVersion: z.number().int().positive()
}).strict();

const providerSchema = z.object({
  providerId: z.string().trim().min(1).max(128),
  claimant: z.string().trim().min(1).max(256)
}).strict();

const providerClaimSchema = z.object({
  providerId: z.string().trim().min(1).max(128),
  claimant: z.string().trim().min(1).max(256),
  expectedVersion: z.number().int().positive()
}).strict();

export function createDemoRouter(options: { secret?: string; secureCookies?: boolean } = {}) {
  const router = express.Router();
  const configuredSecret = options.secret?.trim() ?? "";
  if (process.env.NODE_ENV === "production" && !configuredSecret) {
    throw new Error("demo session secret is required in production");
  }
  const secret = configuredSecret || DEFAULT_DEMO_SECRET;

  router.get("/state", (req, res) => {
    const right = readDemoRight(req, secret) ?? createDemoRight();
    writeDemoRight(res, right, secret, options.secureCookies);
    res.json(right);
  });

  router.post("/reset", (_req, res) => {
    const right = createDemoRight();
    writeDemoRight(res, right, secret, options.secureCookies);
    res.json(right);
  });

  router.post("/entitlements/:id/transfer", (req, res) => {
    const body = transferSchema.parse(req.body);
    const right = requireDemoRight(req, req.params.id, secret);
    const next = transferServiceRight(right, body.from, body.to, { expectedVersion: body.expectedVersion });
    writeDemoRight(res, next, secret, options.secureCookies);
    res.json(next);
  });

  router.post("/entitlements/:id/verify", (req, res) => {
    const body = providerSchema.parse(req.body);
    const right = requireDemoRight(req, req.params.id, secret);
    const decision = evaluateAuthorization(right, {
      entitlementId: right.id,
      providerId: body.providerId,
      claimant: body.claimant
    });
    res.json({
      ...decision,
      entitlementId: right.id,
      providerId: body.providerId,
      claimant: body.claimant,
      verifiedAt: new Date().toISOString()
    });
  });

  router.post("/entitlements/:id/claim", (req, res) => {
    const body = providerClaimSchema.parse(req.body);
    const right = requireDemoRight(req, req.params.id, secret);
    const next = claimServiceRight(
      right,
      body.claimant,
      body.providerId,
      { expectedVersion: body.expectedVersion }
    );
    writeDemoRight(res, next, secret, options.secureCookies);
    res.json(next);
  });

  return router;
}

export function createDemoRight(now = new Date()): ServiceRight {
  const createdAt = now.toISOString();
  return {
    id: "ent-skillpass-care-demo",
    issuerId: "seller-demo",
    schemaVersion: 1,
    productCommitment: "sha256:42f4dc06f496e6209f50c0849c4fb14d0b2a4f752d636a28bb7e091ea462863c",
    owner: "alice",
    serviceClass: "STANDARD_90D",
    remainingClaims: 3,
    expiresAt: "2099-12-31T23:59:59.000Z",
    transferable: true,
    acceptedProviderIds: ["repair-a", "repair-b"],
    status: "ACTIVE",
    version: 1,
    createdAt,
    updatedAt: createdAt
  };
}

function requireDemoRight(req: Request, id: string, secret: string): ServiceRight {
  const right = readDemoRight(req, secret) ?? createDemoRight();
  if (right.id !== id) throw new SkillPassError("NOT_FOUND", "demo entitlement not found", 404);
  return right;
}

function readDemoRight(req: Request, secret: string): ServiceRight | undefined {
  const raw = parseCookies(req.headers.cookie ?? "")[COOKIE_NAME];
  if (!raw) return undefined;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return undefined;
  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const expected = sign(payload, secret);
  if (!safeEqual(signature, expected)) return undefined;
  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    return demoRightSchema.parse(JSON.parse(decoded)) as ServiceRight;
  } catch {
    return undefined;
  }
}

function writeDemoRight(
  res: Response,
  right: ServiceRight,
  secret: string,
  secureCookies = process.env.NODE_ENV === "production"
): void {
  const payload = Buffer.from(JSON.stringify(right), "utf8").toString("base64url");
  const value = `${payload}.${sign(payload, secret)}`;
  const parts = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=86400"
  ];
  if (secureCookies) parts.push("Secure");
  res.setHeader("set-cookie", parts.join("; "));
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const index = pair.indexOf("=");
    if (index <= 0) continue;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}
