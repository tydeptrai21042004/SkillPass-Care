import { z } from "zod";

const bool = z.enum(["true", "false"]).transform((v: string) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  WEB_ORIGINS: z.string().default(""),
  LEDGER_MODE: z.enum(["memory", "ckb"]).default("memory"),
  CARE_STORE_MODE: z.enum(["memory", "postgres"]).default("memory"),
  DATABASE_URL: z.string().default(""),
  ENABLE_DEMO_ENDPOINTS: bool.default("true"),
  DEMO_SESSION_SECRET: z.string().default(""),
  OWNER_PROOF_CHALLENGE_SECRET: z.string().default(""),
  OWNER_PROOF_TTL_SECONDS: z.coerce.number().int().min(30).max(600).default(120),
  ISSUER_KEYS: z.string().default(""),
  PROVIDER_KEYS: z.string().default(""),
  OWNER_KEYS: z.string().default(""),
  CKB_RPC_URL: z.string().url().default("https://testnet.ckbapp.dev"),
  CKB_INDEXER_URL: z.string().url().default("https://testnet.ckbapp.dev")
});

export interface AppConfig {
  NODE_ENV: "development" | "test" | "production";
  PORT: number;
  WEB_ORIGINS: string[];
  LEDGER_MODE: "memory" | "ckb";
  CARE_STORE_MODE: "memory" | "postgres";
  DATABASE_URL: string;
  ENABLE_DEMO_ENDPOINTS: boolean;
  DEMO_SESSION_SECRET: string;
  OWNER_PROOF_CHALLENGE_SECRET: string;
  OWNER_PROOF_TTL_SECONDS: number;
  ISSUER_KEYS: Record<string, string>;
  PROVIDER_KEYS: Record<string, string>;
  OWNER_KEYS: Record<string, string>;
  CKB_RPC_URL: string;
  CKB_INDEXER_URL: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.parse(env);
  const config: AppConfig = {
    ...parsed,
    WEB_ORIGINS: parsed.WEB_ORIGINS.split(",").map((x: string) => x.trim()).filter(Boolean),
    ISSUER_KEYS: parseKeyMap(parsed.ISSUER_KEYS, "ISSUER_KEYS"),
    PROVIDER_KEYS: parseKeyMap(parsed.PROVIDER_KEYS, "PROVIDER_KEYS"),
    OWNER_KEYS: parseKeyMap(parsed.OWNER_KEYS, "OWNER_KEYS")
  };

  if (config.CARE_STORE_MODE === "postgres" && !config.DATABASE_URL.trim()) {
    throw new Error("DATABASE_URL is required when CARE_STORE_MODE=postgres");
  }

  if (config.NODE_ENV === "production") {
    if (config.ENABLE_DEMO_ENDPOINTS && config.DEMO_SESSION_SECRET.trim().length < 32) {
      throw new Error("DEMO_SESSION_SECRET must be at least 32 characters when the production demo is enabled");
    }

    const pilotConfigured = Object.keys(config.ISSUER_KEYS).length > 0
      || Object.keys(config.PROVIDER_KEYS).length > 0
      || Object.keys(config.OWNER_KEYS).length > 0
      || !config.ENABLE_DEMO_ENDPOINTS;

    if (pilotConfigured) {
      if (Object.keys(config.ISSUER_KEYS).length === 0) throw new Error("ISSUER_KEYS is required for production pilot mode");
      if (Object.keys(config.PROVIDER_KEYS).length === 0) throw new Error("PROVIDER_KEYS is required for production pilot mode");
      if (Object.keys(config.OWNER_KEYS).length === 0) throw new Error("OWNER_KEYS is required for production pilot mode");
      if (config.OWNER_PROOF_CHALLENGE_SECRET.trim().length < 32) {
        throw new Error("OWNER_PROOF_CHALLENGE_SECRET must be at least 32 characters for production pilot mode");
      }
      validateSecretStrength(config.ISSUER_KEYS, "ISSUER_KEYS");
      validateSecretStrength(config.PROVIDER_KEYS, "PROVIDER_KEYS");
      validateSecretStrength(config.OWNER_KEYS, "OWNER_KEYS");
    }
  }
  return config;
}

function parseKeyMap(value: string, name: string): Record<string, string> {
  if (!value.trim()) return {};
  const out: Record<string, string> = {};
  for (const entry of value.split(",")) {
    const index = entry.indexOf(":");
    if (index <= 0 || index === entry.length - 1) throw new Error(`${name} entries must use id:secret`);
    const id = entry.slice(0, index).trim();
    const secret = entry.slice(index + 1).trim();
    if (!id || !secret) throw new Error(`${name} entries must use id:secret`);
    if (out[id]) throw new Error(`${name} contains duplicate id: ${id}`);
    out[id] = secret;
  }
  return out;
}

function validateSecretStrength(values: Record<string, string>, name: string): void {
  for (const [id, secret] of Object.entries(values)) {
    if (secret.length < 16) throw new Error(`${name} secret for ${id} must be at least 16 characters in production`);
  }
}
