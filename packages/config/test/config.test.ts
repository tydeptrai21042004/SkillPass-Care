import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/index.js";

const strong = "0123456789abcdef0123456789abcdef";

describe("loadConfig", () => {
  it("requires a strong production demo session secret", () => {
    expect(() => loadConfig({
      NODE_ENV: "production",
      ENABLE_DEMO_ENDPOINTS: "true",
      LEDGER_MODE: "memory",
      DEMO_SESSION_SECRET: "short"
    })).toThrow("DEMO_SESSION_SECRET");
  });

  it("requires complete pilot credentials and an owner-proof challenge secret", () => {
    expect(() => loadConfig({
      NODE_ENV: "production",
      ENABLE_DEMO_ENDPOINTS: "false",
      LEDGER_MODE: "memory",
      ISSUER_KEYS: `seller:${strong}`,
      PROVIDER_KEYS: `repair:${strong}`,
      OWNER_KEYS: `alice:${strong}`,
      OWNER_PROOF_CHALLENGE_SECRET: "short"
    })).toThrow("OWNER_PROOF_CHALLENGE_SECRET");
  });

  it("accepts a hardened production pilot configuration", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      ENABLE_DEMO_ENDPOINTS: "false",
      LEDGER_MODE: "memory",
      ISSUER_KEYS: `seller:${strong}`,
      PROVIDER_KEYS: `repair:${strong}`,
      OWNER_KEYS: `alice:${strong}`,
      OWNER_PROOF_CHALLENGE_SECRET: strong
    });
    expect(config.ENABLE_DEMO_ENDPOINTS).toBe(false);
    expect(config.OWNER_PROOF_TTL_SECONDS).toBe(120);
  });
});
