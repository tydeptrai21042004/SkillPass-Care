import cors from "cors";
import express from "express";
import { z } from "zod";
import type { ServiceRightLedger } from "@skillpass/ckb-adapter";
import { ProviderVerifier } from "@skillpass/provider-sdk";

const createSchema = z.object({
  issuerId: z.string().min(1),
  productHash: z.string().min(1),
  owner: z.string().min(1),
  serviceClass: z.string().min(1),
  remainingClaims: z.number().int().positive(),
  expiresAt: z.string().datetime(),
  transferable: z.boolean(),
  acceptedProviderIds: z.array(z.string().min(1)).min(1)
});

export function createApp(ledger: ServiceRightLedger, webOrigin = "http://localhost:5173") {
  const app = express();
  app.use(cors({ origin: webOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.get("/entitlements", async (_req, res, next) => {
    try { res.json(await ledger.list()); } catch (err) { next(err); }
  });

  app.post("/entitlements", async (req, res, next) => {
    try {
      const input = createSchema.parse(req.body);
      res.status(201).json(await ledger.issue(input));
    } catch (err) { next(err); }
  });

  app.post("/entitlements/:id/transfer", async (req, res, next) => {
    try {
      const body = z.object({ from: z.string().min(1), to: z.string().min(1) }).parse(req.body);
      res.json(await ledger.transfer(req.params.id, body.from, body.to));
    } catch (err) { next(err); }
  });

  app.post("/entitlements/:id/verify", async (req, res, next) => {
    try {
      const body = z.object({ providerId: z.string().min(1), claimant: z.string().min(1) }).parse(req.body);
      const verifier = new ProviderVerifier({ providerId: body.providerId, ledger });
      res.json(await verifier.verify({ entitlementId: req.params.id, claimant: body.claimant }));
    } catch (err) { next(err); }
  });

  app.post("/entitlements/:id/claim", async (req, res, next) => {
    try {
      const body = z.object({ providerId: z.string().min(1), claimant: z.string().min(1) }).parse(req.body);
      res.json(await ledger.claim(req.params.id, body.claimant, body.providerId));
    } catch (err) { next(err); }
  });

  // Demo-only helper. Disable/remove this endpoint in deployed pilots.
  app.post("/demo/reset", async (_req, res, next) => {
    try {
      if (!ledger.resetDemo) throw new Error("demo reset unavailable for this ledger");
      res.json(await ledger.resetDemo());
    } catch (err) { next(err); }
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : "unknown error";
    res.status(400).json({ error: message });
  });

  return app;
}
