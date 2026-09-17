import { z } from "zod";

const bool = z.enum(["true", "false"]).transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  WEB_ORIGINS: z.string().default("http://localhost:5173"),
  LEDGER_MODE: z.enum(["memory", "ckb"]).default("memory"),
  ENABLE_DEMO_ENDPOINTS: bool.default("true"),
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
  ENABLE_DEMO_ENDPOINTS: boolean;
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
    WEB_ORIGINS: parsed.WEB_ORIGINS.split(",").map((x) => x.trim()).filter(Boolean),
    ISSUER_KEYS: parseKeyMap(parsed.ISSUER_KEYS, "ISSUER_KEYS"),
    PROVIDER_KEYS: parseKeyMap(parsed.PROVIDER_KEYS, "PROVIDER_KEYS"),
    OWNER_KEYS: parseKeyMap(parsed.OWNER_KEYS, "OWNER_KEYS")
  };
  if (config.WEB_ORIGINS.length === 0) throw new Error("WEB_ORIGINS must contain at least one origin");
  if (config.NODE_ENV === "production") {
    if (config.ENABLE_DEMO_ENDPOINTS) throw new Error("ENABLE_DEMO_ENDPOINTS must be false in production");
    if (config.LEDGER_MODE === "memory") {
      if (Object.keys(config.ISSUER_KEYS).length === 0) throw new Error("ISSUER_KEYS is required for production memory mode");
      if (Object.keys(config.PROVIDER_KEYS).length === 0) throw new Error("PROVIDER_KEYS is required for production memory mode");
      if (Object.keys(config.OWNER_KEYS).length === 0) throw new Error("OWNER_KEYS is required for production memory mode");
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
