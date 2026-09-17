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
  const app = createApp(ledger, {
    demoEnabled,
    demoSessionSecret: "test-demo-secret",
    secureDemoCookies: false,
    credentials
  });
  return { ledger, right, app };
}

describe("API", () => {
  it("runs a stateless-session demo lifecycle without exposing production credentials", async () => {
    const { app } = await setup();
    const agent = request.agent(app);

    const state = await agent.get("/demo/state").expect(200);
    const id = state.body.id;

    let res = await agent.post(`/demo/entitlements/${id}/verify`).send({ providerId: "repair-a", claimant: "alice" });
    expect(res.body.allowed).toBe(true);

    await agent.post(`/demo/entitlements/${id}/transfer`).send({ from: "alice", to: "bob", expectedVersion: 1 }).expect(200);

    res = await agent.post(`/demo/entitlements/${id}/verify`).send({ providerId: "repair-a", claimant: "alice" });
    expect(res.body.reason).toBe("WRONG_OWNER");
    res = await agent.post(`/demo/entitlements/${id}/verify`).send({ providerId: "repair-b", claimant: "bob" });
    expect(res.body.allowed).toBe(true);
  });

  it("keeps public demo sessions isolated from each other", async () => {
    const { app } = await setup();
    const aliceSession = request.agent(app);
    const freshSession = request.agent(app);
    const initial = await aliceSession.get("/demo/state").expect(200);

    await aliceSession
      .post(`/demo/entitlements/${initial.body.id}/transfer`)
      .send({ from: "alice", to: "bob", expectedVersion: 1 })
      .expect(200);

    expect((await aliceSession.get("/demo/state")).body.owner).toBe("bob");
    expect((await freshSession.get("/demo/state")).body.owner).toBe("alice");
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

  it("protects entitlement list/detail reads", async () => {
    const { right, app } = await setup();
    await request(app).get("/entitlements").expect(401);
    await request(app).get(`/entitlements/${right.id}`).expect(401);

    const list = await request(app)
      .get("/entitlements")
      .set("x-provider-id", "repair-a")
      .set("x-provider-key", "provider-a-secret")
      .expect(200);
    expect(list.body).toHaveLength(1);
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
      .send({ to: "bob", expectedVersion: 2 })
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
    await request(app).get("/demo/state").expect(404);
  });

  it("reports readiness separately from liveness", async () => {
    const { app } = await setup();
    await request(app).get("/health/live").expect(200);
    const ready = await request(app).get("/health/ready").expect(200);
    expect(ready.body.ledger.mode).toBe("memory");
    expect(ready.body.demo).toBe(true);
  });
});
