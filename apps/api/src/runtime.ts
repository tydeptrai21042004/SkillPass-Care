import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { CkbLedgerAdapter, InMemoryLedger, type ServiceRightLedger } from "@skillpass/ckb-adapter";
import { loadConfig } from "@skillpass/config";
import { createApp } from "./app.js";

let cachedApp: ReturnType<typeof createApp> | undefined;

export function getRuntimeApp() {
  if (cachedApp) return cachedApp;

  if (process.env.NODE_ENV !== "production") {
    const rootEnv = fileURLToPath(new URL("../../../.env", import.meta.url));
    try { loadEnvFile(rootEnv); } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
    }
  }

  const config = loadConfig();
  const ledger: ServiceRightLedger = config.LEDGER_MODE === "ckb"
    ? new CkbLedgerAdapter({ rpcUrl: config.CKB_RPC_URL, indexerUrl: config.CKB_INDEXER_URL })
    : new InMemoryLedger();

  cachedApp = createApp(ledger, {
    webOrigins: config.WEB_ORIGINS,
    demoEnabled: config.ENABLE_DEMO_ENDPOINTS,
    demoSessionSecret: config.DEMO_SESSION_SECRET,
    secureDemoCookies: config.NODE_ENV === "production",
    credentials: {
      issuers: config.ISSUER_KEYS,
      providers: config.PROVIDER_KEYS,
      owners: config.OWNER_KEYS
    }
  });
  return cachedApp;
}
