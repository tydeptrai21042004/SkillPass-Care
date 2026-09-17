import { describe, expect, it } from "vitest";
import request from "supertest";
import { InMemoryLedger } from "@skillpass/ckb-adapter";
import { createApp } from "../src/app.js";

const credentials = {
  issuers: { "seller-demo": "issuer-secret" },
  providers: { "repair-a": "provider-a-secret", "repair-b": "provider-b-secret" },
  owners: { alice: "alice-secret", bob: "bob-secret" }
};

async function setup(demoEnabled = true) {
  const ledger = new InMemoryLedger();
  const right = await ledger.resetDemo();
  const app = createApp(ledger, { demoEnabled, credentials });
  return { ledger, right, app };
}

describe("API", () => {
  it("runs the demo ownership lifecycle without exposing production credentials", async () => {
    const { right, app } = await setup();
    let res = await request(app).post(`/demo/entitlements/${right.id}/verify`).send({ providerId: "repair-a", claimant: "alice" });
    expect(res.body.allowed).toBe(true);

    await request(app).post(`/demo/entitlements/${right.id}/transfer`).send({ from: "alice", to: "bob", expectedVersion: 1 }).expect(200);

    res = await request(app).post(`/demo/entitlements/${right.id}/verify`).send({ providerId: "repair-a", claimant: "alice" });
    expect(res.body.reason).toBe("WRONG_OWNER");
    res = await request(app).post(`/demo/entitlements/${right.id}/verify`).send({ providerId: "repair-b", claimant: "bob" });
    expect(res.body.allowed).toBe(true);
  });

  it("authenticates provider identity instead of trusting JSON", async () => {
    const { right, app } = await setup();
    await request(app).post(`/entitlements/${right.id}/verify`).send({ claimant: "alice" }).expect(401);

    const ok = await request(app)
      .post(`/entitlements/${right.id}/verify`)
      .set("x-provider-id", "repair-a")
      .set("x-provider-key", "provider-a-secret")
      .send({ claimant: "alice" })
      .expect(200);
    expect(ok.body.providerId).toBe("repair-a");

    await request(app)
      .post(`/entitlements/${right.id}/verify`)
      .set("x-provider-id", "repair-a")
      .set("x-provider-key", "wrong")
      .send({ claimant: "alice" })
      .expect(401);
  });

  it("authenticates the current owner on transfer", async () => {
    const { right, app } = await setup();
    await request(app)
      .post(`/entitlements/${right.id}/transfer`)
      .set("x-owner-id", "alice")
      .set("x-owner-key", "alice-secret")
      .send({ to: "bob", expectedVersion: 1 })
      .expect(200);

    const stale = await request(app)
      .post(`/entitlements/${right.id}/transfer`)
      .set("x-owner-id", "alice")
      .set("x-owner-key", "alice-secret")
      .send({ to: "bob" })
      .expect(403);
    expect(stale.body.error.code).toBe("FORBIDDEN");
  });

  it("binds issuance identity to issuer credentials", async () => {
    const { app } = await setup();
    const response = await request(app)
      .post("/entitlements")
      .set("x-issuer-id", "seller-demo")
      .set("x-issuer-key", "issuer-secret")
      .send({
        productHash: "sha256:new-device:salt",
        owner: "alice",
        serviceClass: "STANDARD_90D",
        remainingClaims: 2,
        expiresAt: "2099-12-31T23:59:59.000Z",
        transferable: true,
        acceptedProviderIds: ["repair-a", "repair-b"]
      })
      .expect(201);
    expect(response.body.issuerId).toBe("seller-demo");
  });

  it("returns 409 for stale versions and stable error envelopes", async () => {
    const { right, app } = await setup();
    await request(app)
      .post(`/entitlements/${right.id}/transfer`)
      .set("x-owner-id", "alice")
      .set("x-owner-key", "alice-secret")
      .send({ to: "bob", expectedVersion: 1 })
      .expect(200);

    const response = await request(app)
      .post(`/entitlements/${right.id}/transfer`)
      .set("x-owner-id", "bob")
      .set("x-owner-key", "bob-secret")
      .send({ to: "alice", expectedVersion: 1 })
      .expect(409);
    expect(response.body.error.code).toBe("VERSION_CONFLICT");
    expect(response.body.error.requestId).toBeTruthy();
  });

  it("can completely disable demo endpoints", async () => {
    const { app } = await setup(false);
    await request(app).post("/demo/reset").expect(404);
  });

  it("reports readiness separately from liveness", async () => {
    const { app } = await setup();
    await request(app).get("/health/live").expect(200);
    const ready = await request(app).get("/health/ready").expect(200);
    expect(ready.body.ledger.mode).toBe("memory");
  });
});
