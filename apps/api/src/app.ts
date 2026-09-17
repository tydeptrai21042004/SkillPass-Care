import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import { z, ZodError } from "zod";
import type { ServiceRightLedger } from "@skillpass/ckb-adapter";
import { ProviderVerifier } from "@skillpass/provider-sdk";
import { SkillPassError } from "@skillpass/shared";
import { authenticate, type CredentialRegistry } from "./auth.js";

const createSchema = z.object({
  productHash: z.string().trim().min(1).max(512),
  owner: z.string().trim().min(1).max(256),
  serviceClass: z.string().trim().min(1).max(128),
  remainingClaims: z.number().int().positive().max(10_000),
  expiresAt: z.string().datetime(),
  transferable: z.boolean(),
  acceptedProviderIds: z.array(z.string().trim().min(1).max(128)).min(1).max(100)
}).strict();

const transferSchema = z.object({
  to: z.string().trim().min(1).max(256),
  expectedVersion: z.number().int().positive().optional()
}).strict();

const verifySchema = z.object({ claimant: z.string().trim().min(1).max(256) }).strict();
const claimSchema = z.object({
  claimant: z.string().trim().min(1).max(256),
  expectedVersion: z.number().int().positive().optional()
}).strict();
const statusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "REVOKED"]),
  expectedVersion: z.number().int().positive().optional()
}).strict();

const demoActorSchema = z.object({
  from: z.string().trim().min(1).max(256),
  to: z.string().trim().min(1).max(256),
  expectedVersion: z.number().int().positive().optional()
}).strict();
const demoProviderSchema = z.object({
  providerId: z.string().trim().min(1).max(128),
  claimant: z.string().trim().min(1).max(256),
  expectedVersion: z.number().int().positive().optional()
}).strict();

export interface ApiOptions {
  webOrigins?: string[];
  demoEnabled?: boolean;
  credentials?: Partial<CredentialRegistry>;
}

export function createApp(ledger: ServiceRightLedger, options: ApiOptions = {}) {
  const app = express();
  const origins = options.webOrigins ?? ["http://localhost:5173"];
  const credentials: CredentialRegistry = {
    issuers: options.credentials?.issuers ?? {},
    providers: options.credentials?.providers ?? {},
    owners: options.credentials?.owners ?? {}
  };

  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const requestId = req.header("x-request-id")?.slice(0, 128) || randomUUID();
    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("referrer-policy", "no-referrer");
    res.setHeader("x-frame-options", "DENY");
    next();
  });
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) return callback(null, true);
      return callback(new SkillPassError("FORBIDDEN", "origin is not allowed", 403));
    }
  }));
  app.use(express.json({ limit: "64kb" }));

  app.get("/health/live", (_req, res) => res.json({ ok: true }));
  app.get("/health/ready", async (_req, res, next) => {
    try {
      const health = await ledger.health();
      res.status(health.ready ? 200 : 503).json({ ok: health.ready, ledger: health });
    } catch (err) { next(err); }
  });
  app.get("/health", async (_req, res, next) => {
    try {
      const health = await ledger.health();
      res.status(health.ready ? 200 : 503).json({ ok: health.ready, ledger: health });
    } catch (err) { next(err); }
  });

  app.get("/entitlements", async (_req, res, next) => {
    try { res.json(await ledger.list()); } catch (err) { next(err); }
  });

  app.get("/entitlements/:id", async (req, res, next) => {
    try {
      const right = await ledger.get(req.params.id);
      if (!right) throw new SkillPassError("NOT_FOUND", "entitlement not found", 404);
      res.json(right);
    } catch (err) { next(err); }
  });

  // Issuer-authenticated creation. issuerId comes from credentials, never JSON.
  app.post("/entitlements", async (req, res, next) => {
    try {
      const issuerId = authenticate(req, "issuer", credentials);
      const input = createSchema.parse(req.body);
      res.status(201).json(await ledger.issue({ ...input, issuerId }));
    } catch (err) { next(err); }
  });

  // Pilot shared-secret owner authentication. CKB mode must replace this with a wallet-signed transaction.
  app.post("/entitlements/:id/transfer", async (req, res, next) => {
    try {
      const owner = authenticate(req, "owner", credentials);
      const body = transferSchema.parse(req.body);
      res.json(await ledger.transfer(req.params.id, owner, body.to, { expectedVersion: body.expectedVersion }));
    } catch (err) { next(err); }
  });

  // Provider identity is authenticated at the server boundary and cannot be selected in JSON.
  app.post("/entitlements/:id/verify", async (req, res, next) => {
    try {
      const providerId = authenticate(req, "provider", credentials);
      const body = verifySchema.parse(req.body);
      const verifier = new ProviderVerifier({ providerId, ledger });
      res.json(await verifier.verify({ entitlementId: req.params.id, claimant: body.claimant }));
    } catch (err) { next(err); }
  });

  app.post("/entitlements/:id/claim", async (req, res, next) => {
    try {
      const providerId = authenticate(req, "provider", credentials);
      const body = claimSchema.parse(req.body);
      res.json(await ledger.claim(
        req.params.id,
        body.claimant,
        providerId,
        { expectedVersion: body.expectedVersion }
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
    app.post("/demo/reset", async (_req, res, next) => {
      try {
        if (!ledger.resetDemo) throw new SkillPassError("NOT_IMPLEMENTED", "demo reset unavailable", 503);
        res.json(await ledger.resetDemo());
      } catch (err) { next(err); }
    });

    app.post("/demo/entitlements/:id/transfer", async (req, res, next) => {
      try {
        const body = demoActorSchema.parse(req.body);
        res.json(await ledger.transfer(req.params.id, body.from, body.to, { expectedVersion: body.expectedVersion }));
      } catch (err) { next(err); }
    });

    app.post("/demo/entitlements/:id/verify", async (req, res, next) => {
      try {
        const body = demoProviderSchema.parse(req.body);
        const verifier = new ProviderVerifier({ providerId: body.providerId, ledger });
        res.json(await verifier.verify({ entitlementId: req.params.id, claimant: body.claimant }));
      } catch (err) { next(err); }
    });

    app.post("/demo/entitlements/:id/claim", async (req, res, next) => {
      try {
        const body = demoProviderSchema.parse(req.body);
        res.json(await ledger.claim(req.params.id, body.claimant, body.providerId, { expectedVersion: body.expectedVersion }));
      } catch (err) { next(err); }
    });
  }

  app.use((_req, res) => {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "route not found", requestId: res.locals.requestId }
    });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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
    if (err instanceof SkillPassError) {
      return res.status(err.status).json({
        error: { code: err.code, message: err.message, requestId: res.locals.requestId }
      });
    }
    console.error("[skillpass-api] unexpected error", { requestId: res.locals.requestId, err });
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "internal server error", requestId: res.locals.requestId }
    });
  });

  return app;
}
