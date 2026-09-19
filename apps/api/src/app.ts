import { randomUUID } from "node:crypto";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { z, ZodError } from "zod";
import type { ServiceRightLedger } from "@skillpass/ckb-adapter";
import { createHmacEvidenceSigner, ProviderVerifier } from "@skillpass/provider-sdk";
import { SkillPassError, type OwnerProof } from "@skillpass/shared";
import { authenticate, authenticateAny, type ActorType, type CredentialRegistry } from "./auth.js";
import { createDemoRouter } from "./demo-session.js";
import {
  claimRequestHash,
  createPilotOwnerProof,
  issueOwnerChallenge,
  ownerProofRequestHash,
  verifyChallengeToken,
  verifyPilotOwnerProof
} from "./owner-proof.js";

const createSchema = z.object({
  productCommitment: z.string().trim().regex(/^sha256:[0-9a-f]{64}$/i, "productCommitment must be sha256:<64 hex>").optional(),
  /** @deprecated accepted temporarily for v0.3 clients */
  productHash: z.string().trim().regex(/^sha256:[0-9a-f]{64}$/i, "productHash must be sha256:<64 hex>").optional(),
  owner: z.string().trim().min(1).max(256),
  serviceClass: z.string().trim().min(1).max(128),
  remainingClaims: z.number().int().positive().max(10_000),
  expiresAt: z.string().datetime(),
  transferable: z.boolean(),
  acceptedProviderIds: z.array(z.string().trim().min(1).max(128)).min(1).max(100)
}).strict().superRefine((value, ctx) => {
  if (!value.productCommitment && !value.productHash) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "productCommitment is required", path: ["productCommitment"] });
  }
  if (value.productCommitment && value.productHash && value.productCommitment.toLowerCase() !== value.productHash.toLowerCase()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "productCommitment and legacy productHash must match", path: ["productCommitment"] });
  }
  if (new Set(value.acceptedProviderIds).size !== value.acceptedProviderIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "acceptedProviderIds must be unique", path: ["acceptedProviderIds"] });
  }
});

const transferSchema = z.object({
  to: z.string().trim().min(1).max(256),
  expectedVersion: z.number().int().positive()
}).strict();

const challengeSchema = z.object({
  claimant: z.string().trim().min(1).max(256),
  action: z.enum(["VERIFY", "CLAIM"]),
  serviceEventId: z.string().trim().min(1).max(256).optional()
}).strict().superRefine((value, ctx) => {
  if (value.action === "CLAIM" && !value.serviceEventId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "serviceEventId is required for CLAIM", path: ["serviceEventId"] });
  }
  if (value.action === "VERIFY" && value.serviceEventId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "serviceEventId is only valid for CLAIM", path: ["serviceEventId"] });
  }
});

const proofSchema = z.object({
  scheme: z.literal("HMAC-SHA256-PILOT"),
  challengeId: z.string().uuid(),
  claimant: z.string().trim().min(1).max(256),
  value: z.string().min(16).max(256)
}).strict();

const proofRequestSchema = z.object({
  claimant: z.string().trim().min(1).max(256),
  challengeToken: z.string().min(32).max(4096),
  ownerProof: proofSchema
}).strict();

const claimSchema = proofRequestSchema.extend({
  serviceEventId: z.string().trim().min(1).max(256),
  expectedVersion: z.number().int().positive()
}).strict();

const ownerSignSchema = z.object({ challengeToken: z.string().min(32).max(4096) }).strict();
const statusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "REVOKED"]),
  expectedVersion: z.number().int().positive()
}).strict();

export interface ApiOptions {
  webOrigins?: string[];
  demoEnabled?: boolean;
  demoSessionSecret?: string;
  ownerProofChallengeSecret?: string;
  ownerProofTtlSeconds?: number;
  secureDemoCookies?: boolean;
  credentials?: Partial<CredentialRegistry>;
}

export function createApp(ledger: ServiceRightLedger, options: ApiOptions = {}) {
  const app = express();
  const origins = options.webOrigins ?? [];
  const credentials: CredentialRegistry = {
    issuers: options.credentials?.issuers ?? {},
    providers: options.credentials?.providers ?? {},
    owners: options.credentials?.owners ?? {}
  };
  const pilotCredentialsConfigured = Object.keys(credentials.issuers).length > 0
    || Object.keys(credentials.providers).length > 0
    || Object.keys(credentials.owners).length > 0;
  const configuredOwnerProofSecret = options.ownerProofChallengeSecret?.trim() ?? "";
  if (process.env.NODE_ENV === "production" && pilotCredentialsConfigured && !configuredOwnerProofSecret) {
    throw new Error("ownerProofChallengeSecret is required when production pilot credentials are configured");
  }
  const ownerProofSecret = configuredOwnerProofSecret || "skillpass-care-local-owner-proof-challenge-secret";
  const ownerProofTtlSeconds = options.ownerProofTtlSeconds ?? 120;

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = req.header("x-request-id")?.slice(0, 128) || randomUUID();
    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    res.setHeader("cache-control", "no-store");
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("referrer-policy", "no-referrer");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("content-security-policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("strict-transport-security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  if (origins.length > 0) {
    app.use(cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || origins.includes(origin)) return callback(null, true);
        return callback(new SkillPassError("FORBIDDEN", "origin is not allowed", 403));
      }
    }));
  }

  app.use(express.json({ limit: "64kb", strict: true }));

  app.get("/", (_req, res) => res.json({
    name: "SkillPass Care API",
    version: "0.4.0",
    health: "/health/ready",
    demo: options.demoEnabled ? "/demo/state" : null
  }));

  app.get("/health/live", (_req, res) => res.json({ ok: true }));
  app.get("/health/ready", async (_req, res, next) => {
    try {
      const health = await ledger.health();
      res.status(health.ready ? 200 : 503).json({ ok: health.ready, ledger: health, demo: Boolean(options.demoEnabled) });
    } catch (err) { next(err); }
  });
  app.get("/health", async (_req, res, next) => {
    try {
      const health = await ledger.health();
      res.status(health.ready ? 200 : 503).json({ ok: health.ready, ledger: health, demo: Boolean(options.demoEnabled) });
    } catch (err) { next(err); }
  });

  app.get("/meta", async (_req, res, next) => {
    try {
      const health = await ledger.health();
      res.json({
        name: "SkillPass Care",
        apiVersion: "0.4.0",
        serviceRightSchemaVersion: 1,
        ownerProof: "HMAC-SHA256-PILOT",
        ownerProofTtlSeconds,
        claimIdempotency: true,
        scopedReads: true,
        demoEnabled: Boolean(options.demoEnabled),
        demoRoute: options.demoEnabled ? "/demo/state" : null,
        ledgerMode: health.mode,
        ledgerReady: health.ready,
        ckbImplemented: false
      });
    } catch (err) { next(err); }
  });

  app.get("/entitlements", async (req, res, next) => {
    try {
      const actor = authenticateAny(req, ["issuer", "provider", "owner"], credentials);
      res.json(await ledger.list(actorFilter(actor.type, actor.id)));
    } catch (err) { next(err); }
  });

  app.get("/entitlements/:id", async (req, res, next) => {
    try {
      const actor = authenticateAny(req, ["issuer", "provider", "owner"], credentials);
      const right = await ledger.get(req.params.id);
      if (!right || !canReadRight(actor.type, actor.id, right)) {
        throw new SkillPassError("NOT_FOUND", "entitlement not found", 404);
      }
      res.json(right);
    } catch (err) { next(err); }
  });

  app.post("/entitlements", async (req, res, next) => {
    try {
      const issuerId = authenticate(req, "issuer", credentials);
      const input = createSchema.parse(req.body);
      const productCommitment = input.productCommitment ?? input.productHash!;
      const { productHash: _legacy, ...rest } = input;
      res.status(201).json(await ledger.issue({ ...rest, productCommitment, issuerId }));
    } catch (err) { next(err); }
  });

  app.post("/entitlements/:id/transfer", async (req, res, next) => {
    try {
      const owner = authenticate(req, "owner", credentials);
      const body = transferSchema.parse(req.body);
      res.json(await ledger.transfer(req.params.id, owner, body.to, { expectedVersion: body.expectedVersion }));
    } catch (err) { next(err); }
  });

  /** Provider creates a challenge; the claimant must prove possession before verify/claim. */
  app.post("/entitlements/:id/challenges", async (req, res, next) => {
    try {
      const providerId = authenticate(req, "provider", credentials);
      const body = challengeSchema.parse(req.body);
      const right = await ledger.get(req.params.id);
      if (!right || !right.acceptedProviderIds.includes(providerId)) {
        throw new SkillPassError("NOT_FOUND", "entitlement not found", 404);
      }
      res.status(201).json(issueOwnerChallenge({
        entitlementId: right.id,
        providerId,
        claimant: body.claimant,
        action: body.action,
        serviceEventId: body.serviceEventId,
        secret: ownerProofSecret,
        ttlSeconds: ownerProofTtlSeconds
      }));
    } catch (err) { next(err); }
  });

  /** Pilot signing surface. A real CKB client replaces this with local wallet signing. */
  app.post("/owner-proof/sign", (req, res, next) => {
    try {
      const owner = authenticate(req, "owner", credentials);
      const body = ownerSignSchema.parse(req.body);
      const challenge = verifyChallengeToken(body.challengeToken, ownerProofSecret);
      if (challenge.claimant !== owner) {
        throw new SkillPassError("FORBIDDEN", "challenge claimant does not match authenticated owner", 403);
      }
      const ownerSecret = credentials.owners[owner];
      res.json(createPilotOwnerProof(challenge, ownerSecret));
    } catch (err) { next(err); }
  });

  app.post("/entitlements/:id/verify", async (req, res, next) => {
    try {
      const providerId = authenticate(req, "provider", credentials);
      const body = proofRequestSchema.parse(req.body);
      const challenge = requireOwnerProof({
        entitlementId: req.params.id,
        providerId,
        claimant: body.claimant,
        action: "VERIFY",
        token: body.challengeToken,
        proof: body.ownerProof,
        ownerProofSecret,
        credentials
      });
      const verifier = new ProviderVerifier({
        providerId,
        ledger,
        evidenceSigner: createHmacEvidenceSigner(providerId, credentials.providers[providerId])
      });
      res.json(await verifier.verify({
        entitlementId: req.params.id,
        claimant: body.claimant,
        challengeId: challenge.challengeId,
        requestHash: ownerProofRequestHash(challenge)
      }));
    } catch (err) { next(err); }
  });

  app.post("/entitlements/:id/claim", async (req, res, next) => {
    try {
      const providerId = authenticate(req, "provider", credentials);
      const body = claimSchema.parse(req.body);
      const challenge = requireOwnerProof({
        entitlementId: req.params.id,
        providerId,
        claimant: body.claimant,
        action: "CLAIM",
        serviceEventId: body.serviceEventId,
        token: body.challengeToken,
        proof: body.ownerProof,
        ownerProofSecret,
        credentials
      });
      res.json(await ledger.claim(
        req.params.id,
        body.claimant,
        providerId,
        {
          expectedVersion: body.expectedVersion,
          serviceEventId: body.serviceEventId,
          requestHash: claimRequestHash(challenge)
        }
      ));
    } catch (err) { next(err); }
  });

  app.patch("/entitlements/:id/status", async (req, res, next) => {
    try {
      const issuerId = authenticate(req, "issuer", credentials);
      const body = statusSchema.parse(req.body);
      res.json(await ledger.setStatus(req.params.id, issuerId, body.status, { expectedVersion: body.expectedVersion }));
    } catch (err) { next(err); }
  });

  if (options.demoEnabled) {
    app.use("/demo", createDemoRouter({
      secret: options.demoSessionSecret,
      secureCookies: options.secureDemoCookies
    }));
  }

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "route not found", requestId: res.locals.requestId } });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "request validation failed",
          issues: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
          requestId: res.locals.requestId
        }
      });
    }
    if (isJsonParseError(err)) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "request body is not valid JSON", requestId: res.locals.requestId }
      });
    }
    if (err instanceof SkillPassError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, requestId: res.locals.requestId } });
    }
    console.error("[skillpass-api] unexpected error", { requestId: res.locals.requestId, err });
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "internal server error", requestId: res.locals.requestId }
    });
  });

  return app;
}

function actorFilter(type: ActorType, id: string) {
  if (type === "issuer") return { issuerId: id };
  if (type === "provider") return { providerId: id };
  return { owner: id };
}

function canReadRight(type: ActorType, id: string, right: {
  issuerId: string;
  owner: string;
  acceptedProviderIds: string[];
}): boolean {
  if (type === "issuer") return right.issuerId === id;
  if (type === "provider") return right.acceptedProviderIds.includes(id);
  return right.owner === id;
}

function requireOwnerProof(input: {
  entitlementId: string;
  providerId: string;
  claimant: string;
  action: "VERIFY" | "CLAIM";
  serviceEventId?: string;
  token: string;
  proof: OwnerProof;
  ownerProofSecret: string;
  credentials: CredentialRegistry;
}) {
  const challenge = verifyChallengeToken(input.token, input.ownerProofSecret);
  const matches = challenge.entitlementId === input.entitlementId
    && challenge.providerId === input.providerId
    && challenge.claimant === input.claimant
    && challenge.action === input.action
    && (challenge.serviceEventId ?? undefined) === (input.serviceEventId ?? undefined);
  if (!matches) throw new SkillPassError("CHALLENGE_INVALID", "challenge is not bound to this request", 401);
  const ownerSecret = input.credentials.owners[input.claimant];
  if (!ownerSecret) throw new SkillPassError("OWNER_PROOF_REQUIRED", "claimant has no configured pilot owner credential", 401);
  verifyPilotOwnerProof(challenge, input.proof, ownerSecret);
  return challenge;
}

function isJsonParseError(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as { type?: string }).type === "entity.parse.failed");
}
