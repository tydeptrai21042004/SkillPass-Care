import { describe, expect, it } from "vitest";
import request from "supertest";
import { InMemoryLedger } from "@skillpass-care/ckb-adapter";
import { verifyHmacAuthorizationEvidence } from "@skillpass-care/provider-sdk";
import { createApp } from "../src/app.js";

const credentials = {
  issuers: { "seller-demo": "issuer-secret-long", "seller-other": "issuer-other-secret" },
  providers: { "repair-a": "provider-a-secret", "repair-b": "provider-b-secret" },
  owners: { alice: "alice-secret-long", bob: "bob-secret-long" }
};

async function setup(demoEnabled = true) {
  const ledger = new InMemoryLedger();
  const right = await ledger.resetDemo();
  const app = createApp(ledger, {
    demoEnabled,
    demoSessionSecret: "test-demo-secret-that-is-long-enough",
    ownerProofChallengeSecret: "test-owner-proof-challenge-secret-long-enough",
    ownerProofTtlSeconds: 120,
    secureDemoCookies: false,
    credentials
  });
  return { ledger, right, app };
}

async function createProof(input: {
  app: ReturnType<typeof createApp>;
  entitlementId: string;
  providerId: "repair-a" | "repair-b";
  providerKey: string;
  claimant: "alice" | "bob";
  ownerKey: string;
  action: "VERIFY" | "CLAIM";
  serviceEventId?: string;
  serviceType?: "DIAGNOSTIC" | "INSPECTION" | "REPAIR" | "REPLACEMENT" | "BATTERY_REPLACEMENT";
  unitsConsumed?: number;
}) {
  const challengeResponse = await request(input.app)
    .post(`/entitlements/${input.entitlementId}/challenges`)
    .set("x-provider-id", input.providerId)
    .set("x-provider-key", input.providerKey)
    .send({
      claimant: input.claimant,
      action: input.action,
      serviceEventId: input.serviceEventId,
      serviceType: input.serviceType,
      unitsConsumed: input.unitsConsumed
    })
    .expect(201);

  const proofResponse = await request(input.app)
    .post("/owner-proof/sign")
    .set("x-owner-id", input.claimant)
    .set("x-owner-key", input.ownerKey)
    .send({ challengeToken: challengeResponse.body.token })
    .expect(200);

  return { challenge: challengeResponse.body, proof: proofResponse.body };
}

describe("API", () => {
  it("runs a stateless-session public demo lifecycle without production credentials", async () => {
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
    const movedSession = request.agent(app);
    const freshSession = request.agent(app);
    const initial = await movedSession.get("/demo/state").expect(200);
    await movedSession.post(`/demo/entitlements/${initial.body.id}/transfer`)
      .send({ from: "alice", to: "bob", expectedVersion: 1 }).expect(200);
    expect((await movedSession.get("/demo/state")).body.owner).toBe("bob");
    expect((await freshSession.get("/demo/state")).body.owner).toBe("alice");
  });

  it("requires claimant proof-of-possession instead of trusting a provider-supplied claimant string", async () => {
    const { right, app } = await setup();
    await request(app)
      .post(`/entitlements/${right.id}/verify`)
      .set("x-provider-id", "repair-a")
      .set("x-provider-key", "provider-a-secret")
      .send({ claimant: "alice" })
      .expect(400);

    const { challenge, proof } = await createProof({
      app, entitlementId: right.id, providerId: "repair-a", providerKey: "provider-a-secret",
      claimant: "alice", ownerKey: "alice-secret-long", action: "VERIFY"
    });
    const ok = await request(app)
      .post(`/entitlements/${right.id}/verify`)
      .set("x-provider-id", "repair-a")
      .set("x-provider-key", "provider-a-secret")
      .send({ claimant: "alice", challengeToken: challenge.token, ownerProof: proof })
      .expect(200);
    expect(ok.body.allowed).toBe(true);
    expect(ok.body.challengeId).toBe(challenge.challengeId);
    expect(ok.body.signature.keyId).toBe("repair-a");
    expect(verifyHmacAuthorizationEvidence(ok.body, "provider-a-secret")).toBe(true);

    await request(app)
      .post(`/entitlements/${right.id}/verify`)
      .set("x-provider-id", "repair-a")
      .set("x-provider-key", "provider-a-secret")
      .send({ claimant: "alice", challengeToken: challenge.token, ownerProof: { ...proof, value: "invalid-invalid-invalid" } })
      .expect(401);
  });

  it("binds challenges to provider, entitlement, action, claimant, and service event", async () => {
    const { right, app } = await setup();
    const { challenge, proof } = await createProof({
      app, entitlementId: right.id, providerId: "repair-a", providerKey: "provider-a-secret",
      claimant: "alice", ownerKey: "alice-secret-long", action: "VERIFY"
    });
    const response = await request(app)
      .post(`/entitlements/${right.id}/verify`)
      .set("x-provider-id", "repair-b")
      .set("x-provider-key", "provider-b-secret")
      .send({ claimant: "alice", challengeToken: challenge.token, ownerProof: proof })
      .expect(401);
    expect(response.body.error.code).toBe("CHALLENGE_INVALID");
  });

  it("checks latest ownership even when a valid proof was created before transfer", async () => {
    const { right, app } = await setup();
    const staleProof = await createProof({
      app, entitlementId: right.id, providerId: "repair-a", providerKey: "provider-a-secret",
      claimant: "alice", ownerKey: "alice-secret-long", action: "VERIFY"
    });
    await request(app)
      .post(`/entitlements/${right.id}/transfer`)
      .set("x-owner-id", "alice")
      .set("x-owner-key", "alice-secret-long")
      .send({ to: "bob", expectedVersion: 1 })
      .expect(200);

    const stale = await request(app)
      .post(`/entitlements/${right.id}/verify`)
      .set("x-provider-id", "repair-a")
      .set("x-provider-key", "provider-a-secret")
      .send({ claimant: "alice", challengeToken: staleProof.challenge.token, ownerProof: staleProof.proof })
      .expect(200);
    expect(stale.body.reason).toBe("WRONG_OWNER");
  });

  it("scopes entitlement list and detail reads to the authenticated actor", async () => {
    const { ledger, right, app } = await setup();
    const other = await ledger.issue({
      issuerId: "seller-other",
      productCommitment: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      owner: "bob",
      serviceClass: "OTHER",
      remainingClaims: 1,
      expiresAt: "2099-12-31T23:59:59.000Z",
      transferable: true,
      acceptedProviderIds: ["repair-b"]
    });

    const providerAList = await request(app).get("/entitlements")
      .set("x-provider-id", "repair-a").set("x-provider-key", "provider-a-secret").expect(200);
    expect(providerAList.body.map((x: { id: string }) => x.id)).toEqual([right.id]);

    const bobList = await request(app).get("/entitlements")
      .set("x-owner-id", "bob").set("x-owner-key", "bob-secret-long").expect(200);
    expect(bobList.body.map((x: { id: string }) => x.id)).toEqual([other.id]);

    await request(app).get(`/entitlements/${other.id}`)
      .set("x-provider-id", "repair-a").set("x-provider-key", "provider-a-secret").expect(404);
  });

  it("authenticates the current owner on transfer", async () => {
    const { right, app } = await setup();
    await request(app).post(`/entitlements/${right.id}/transfer`)
      .set("x-owner-id", "alice").set("x-owner-key", "alice-secret-long")
      .send({ to: "bob", expectedVersion: 1 }).expect(200);

    const stale = await request(app).post(`/entitlements/${right.id}/transfer`)
      .set("x-owner-id", "alice").set("x-owner-key", "alice-secret-long")
      .send({ to: "bob", expectedVersion: 2 }).expect(403);
    expect(stale.body.error.code).toBe("FORBIDDEN");
  });

  it("binds issuance identity to issuer credentials and accepts the legacy productHash alias", async () => {
    const { app } = await setup();
    const response = await request(app).post("/entitlements")
      .set("x-issuer-id", "seller-demo").set("x-issuer-key", "issuer-secret-long")
      .send({
        productHash: "sha256:9999999999999999999999999999999999999999999999999999999999999999",
        owner: "alice",
        serviceClass: "STANDARD_90D",
        remainingClaims: 2,
        expiresAt: "2099-12-31T23:59:59.000Z",
        transferable: true,
        acceptedProviderIds: ["repair-a", "repair-b"]
      }).expect(201);
    expect(response.body.issuerId).toBe("seller-demo");
    expect(response.body.productCommitment).toBe("sha256:9999999999999999999999999999999999999999999999999999999999999999");
    expect(response.body.productHash).toBeUndefined();
  });

  it("makes service claims idempotent and replay-safe by serviceEventId + request hash", async () => {
    const { right, app, ledger } = await setup();
    const proof = await createProof({
      app, entitlementId: right.id, providerId: "repair-a", providerKey: "provider-a-secret",
      claimant: "alice", ownerKey: "alice-secret-long", action: "CLAIM", serviceEventId: "repair-job-001"
    });
    const body = {
      claimant: "alice",
      serviceEventId: "repair-job-001",
      expectedVersion: 1,
      challengeToken: proof.challenge.token,
      ownerProof: proof.proof
    };
    const first = await request(app).post(`/entitlements/${right.id}/claim`)
      .set("x-provider-id", "repair-a").set("x-provider-key", "provider-a-secret")
      .send(body).expect(200);
    const retry = await request(app).post(`/entitlements/${right.id}/claim`)
      .set("x-provider-id", "repair-a").set("x-provider-key", "provider-a-secret")
      .send(body).expect(200);
    expect(retry.body).toEqual(first.body);
    expect((await ledger.get(right.id))?.remainingClaims).toBe(2);

    const refreshedProof = await createProof({
      app, entitlementId: right.id, providerId: "repair-a", providerKey: "provider-a-secret",
      claimant: "alice", ownerKey: "alice-secret-long", action: "CLAIM", serviceEventId: "repair-job-001"
    });
    const refreshedRetry = await request(app).post(`/entitlements/${right.id}/claim`)
      .set("x-provider-id", "repair-a").set("x-provider-key", "provider-a-secret")
      .send({ ...body, challengeToken: refreshedProof.challenge.token, ownerProof: refreshedProof.proof })
      .expect(200);
    expect(refreshedRetry.body).toEqual(first.body);

    await request(app).post(`/entitlements/${right.id}/transfer`)
      .set("x-owner-id", "alice").set("x-owner-key", "alice-secret-long")
      .send({ to: "bob", expectedVersion: 2 }).expect(200);
    const bobProof = await createProof({
      app, entitlementId: right.id, providerId: "repair-a", providerKey: "provider-a-secret",
      claimant: "bob", ownerKey: "bob-secret-long", action: "CLAIM", serviceEventId: "repair-job-001"
    });
    const conflict = await request(app).post(`/entitlements/${right.id}/claim`)
      .set("x-provider-id", "repair-a").set("x-provider-key", "provider-a-secret")
      .send({ claimant: "bob", serviceEventId: "repair-job-001", expectedVersion: 3,
        challengeToken: bobProof.challenge.token, ownerProof: bobProof.proof })
      .expect(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("preserves Care coverage across transfer and provider changes", async () => {
    const { right, app } = await setup();

    const alice = await createProof({
      app, entitlementId: right.id, providerId: "repair-a", providerKey: "provider-a-secret",
      claimant: "alice", ownerKey: "alice-secret-long", action: "CLAIM", serviceEventId: "diag-alice-001",
      serviceType: "DIAGNOSTIC", unitsConsumed: 1
    });
    const aliceEvent = await request(app).post(`/entitlements/${right.id}/service-events`)
      .set("x-provider-id", "repair-a").set("x-provider-key", "provider-a-secret")
      .send({
        claimant: "alice", serviceEventId: "diag-alice-001", serviceType: "DIAGNOSTIC", unitsConsumed: 1,
        expectedVersion: 1, challengeToken: alice.challenge.token, ownerProof: alice.proof
      }).expect(201);
    expect(aliceEvent.body.entitlement.remainingClaims).toBe(2);
    expect(aliceEvent.body.event.providerId).toBe("repair-a");

    await request(app).post(`/entitlements/${right.id}/transfer`)
      .set("x-owner-id", "alice").set("x-owner-key", "alice-secret-long")
      .send({ to: "bob", expectedVersion: 2 }).expect(200);

    const bob = await createProof({
      app, entitlementId: right.id, providerId: "repair-b", providerKey: "provider-b-secret",
      claimant: "bob", ownerKey: "bob-secret-long", action: "CLAIM", serviceEventId: "repair-bob-001",
      serviceType: "REPAIR", unitsConsumed: 1
    });
    const bobEvent = await request(app).post(`/entitlements/${right.id}/service-events`)
      .set("x-provider-id", "repair-b").set("x-provider-key", "provider-b-secret")
      .send({
        claimant: "bob", serviceEventId: "repair-bob-001", serviceType: "REPAIR", unitsConsumed: 1,
        expectedVersion: 3, challengeToken: bob.challenge.token, ownerProof: bob.proof
      }).expect(201);
    expect(bobEvent.body.entitlement.owner).toBe("bob");
    expect(bobEvent.body.entitlement.remainingClaims).toBe(1);

    const history = await request(app).get(`/entitlements/${right.id}/service-events`)
      .set("x-owner-id", "bob").set("x-owner-key", "bob-secret-long").expect(200);
    expect(history.body).toHaveLength(2);
    expect(history.body.map((event: { providerId: string }) => event.providerId)).toEqual(["repair-a", "repair-b"]);

    const providerAHistory = await request(app).get(`/entitlements/${right.id}/service-events`)
      .set("x-provider-id", "repair-a").set("x-provider-key", "provider-a-secret").expect(200);
    expect(providerAHistory.body).toHaveLength(1);
    expect(providerAHistory.body[0].providerId).toBe("repair-a");
  });

  it("rejects a pre-transfer service proof after ownership changes", async () => {
    const { right, app } = await setup();
    const stale = await createProof({
      app, entitlementId: right.id, providerId: "repair-a", providerKey: "provider-a-secret",
      claimant: "alice", ownerKey: "alice-secret-long", action: "CLAIM", serviceEventId: "stale-service-001",
      serviceType: "REPAIR", unitsConsumed: 1
    });

    await request(app).post(`/entitlements/${right.id}/transfer`)
      .set("x-owner-id", "alice").set("x-owner-key", "alice-secret-long")
      .send({ to: "bob", expectedVersion: 1 }).expect(200);

    const response = await request(app).post(`/entitlements/${right.id}/service-events`)
      .set("x-provider-id", "repair-a").set("x-provider-key", "provider-a-secret")
      .send({
        claimant: "alice", serviceEventId: "stale-service-001", serviceType: "REPAIR", unitsConsumed: 1,
        expectedVersion: 2, challengeToken: stale.challenge.token, ownerProof: stale.proof
      }).expect(403);
    expect(response.body.error.message).toContain("WRONG_OWNER");
  });

  it("binds service type and units into the owner-approved request", async () => {
    const { right, app } = await setup();
    const proof = await createProof({
      app, entitlementId: right.id, providerId: "repair-a", providerKey: "provider-a-secret",
      claimant: "alice", ownerKey: "alice-secret-long", action: "CLAIM", serviceEventId: "bound-service-001",
      serviceType: "DIAGNOSTIC", unitsConsumed: 1
    });
    const response = await request(app).post(`/entitlements/${right.id}/service-events`)
      .set("x-provider-id", "repair-a").set("x-provider-key", "provider-a-secret")
      .send({
        claimant: "alice", serviceEventId: "bound-service-001", serviceType: "REPAIR", unitsConsumed: 1,
        expectedVersion: 1, challengeToken: proof.challenge.token, ownerProof: proof.proof
      }).expect(401);
    expect(response.body.error.code).toBe("CHALLENGE_INVALID");
  });

  it("returns 409 for stale versions and stable error envelopes", async () => {
    const { right, app } = await setup();
    await request(app).post(`/entitlements/${right.id}/transfer`)
      .set("x-owner-id", "alice").set("x-owner-key", "alice-secret-long")
      .send({ to: "bob", expectedVersion: 1 }).expect(200);

    const response = await request(app).post(`/entitlements/${right.id}/transfer`)
      .set("x-owner-id", "bob").set("x-owner-key", "bob-secret-long")
      .send({ to: "alice", expectedVersion: 1 }).expect(409);
    expect(response.body.error.code).toBe("VERSION_CONFLICT");
    expect(response.body.error.requestId).toBeTruthy();
  });

  it("rejects malformed JSON with a validation error rather than 500", async () => {
    const { app } = await setup();
    const response = await request(app).post("/entitlements")
      .set("content-type", "application/json")
      .send('{"bad":').expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("advertises hardened pilot capabilities in metadata", async () => {
    const { app } = await setup(true);
    const meta = await request(app).get("/meta").expect(200);
    expect(meta.body.apiVersion).toBe("0.5.0");
    expect(meta.body.demoEnabled).toBe(true);
    expect(meta.body.ownerProof).toBe("HMAC-SHA256-PILOT");
    expect(meta.body.claimIdempotency).toBe(true);
    expect(meta.body.scopedReads).toBe(true);
  });

  it("can completely disable demo endpoints", async () => {
    const { app } = await setup(false);
    const meta = await request(app).get("/meta").expect(200);
    expect(meta.body.demoEnabled).toBe(false);
    expect(meta.body.demoRoute).toBeNull();
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
