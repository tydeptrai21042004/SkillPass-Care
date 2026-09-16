import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  LEDGER_MODE: z.enum(["memory", "ckb"]).default("memory"),
  CKB_RPC_URL: z.string().default("https://testnet.ckbapp.dev"),
  CKB_INDEXER_URL: z.string().default("https://testnet.ckbapp.dev")
});

export type AppConfig = z.infer<typeof schema>;
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return schema.parse(env);
}
