import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { CkbLedgerAdapter, InMemoryLedger, type ServiceRightLedger } from "@skillpass/ckb-adapter";
import { loadConfig } from "@skillpass/config";
import { createApp } from "./app.js";

const rootEnv = fileURLToPath(new URL("../../../.env", import.meta.url));
try { loadEnvFile(rootEnv); } catch (error) {
  const code = (error as NodeJS.ErrnoException).code;
  if (code !== "ENOENT") throw error;
}

const config = loadConfig();

const ledger: ServiceRightLedger = config.LEDGER_MODE === "ckb"
  ? new CkbLedgerAdapter({ rpcUrl: config.CKB_RPC_URL, indexerUrl: config.CKB_INDEXER_URL })
  : new InMemoryLedger();

if (config.ENABLE_DEMO_ENDPOINTS && ledger.resetDemo) await ledger.resetDemo();

const app = createApp(ledger, {
  webOrigins: config.WEB_ORIGINS,
  demoEnabled: config.ENABLE_DEMO_ENDPOINTS,
  credentials: {
    issuers: config.ISSUER_KEYS,
    providers: config.PROVIDER_KEYS,
    owners: config.OWNER_KEYS
  }
});

app.listen(config.PORT, () => {
  console.log(`[skillpass-api] listening on http://localhost:${config.PORT} (${config.LEDGER_MODE})`);
  if (config.ENABLE_DEMO_ENDPOINTS) console.warn("[skillpass-api] demo endpoints ENABLED; never enable them in production");
  if (config.LEDGER_MODE === "ckb") console.warn("[skillpass-api] CKB mode is fail-closed until the SkillPass Cell schema/write path is implemented");
});
