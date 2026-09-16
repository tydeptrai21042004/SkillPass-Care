import { describe, expect, it } from "vitest";
import request from "supertest";
import { InMemoryLedger } from "@skillpass/ckb-adapter";
import { createApp } from "../src/app.js";

describe("API lifecycle", () => {
  it("moves authorization from Alice to Bob", async () => {
    const ledger = new InMemoryLedger();
    const right = await ledger.resetDemo();
    const app = createApp(ledger);

    let res = await request(app).post(`/entitlements/${right.id}/verify`).send({ providerId: "repair-a", claimant: "alice" });
    expect(res.body.allowed).toBe(true);

    await request(app).post(`/entitlements/${right.id}/transfer`).send({ from: "alice", to: "bob" }).expect(200);

    res = await request(app).post(`/entitlements/${right.id}/verify`).send({ providerId: "repair-a", claimant: "alice" });
    expect(res.body.reason).toBe("WRONG_OWNER");

    res = await request(app).post(`/entitlements/${right.id}/verify`).send({ providerId: "repair-b", claimant: "bob" });
    expect(res.body.allowed).toBe(true);
  });
});
