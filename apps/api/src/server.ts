import { CkbLedgerAdapter, InMemoryLedger, type ServiceRightLedger } from "@skillpass/ckb-adapter";
import { loadConfig } from "@skillpass/config";
import { createApp } from "./app.js";

const config = loadConfig();

const ledger: ServiceRightLedger = config.LEDGER_MODE === "ckb"
  ? new CkbLedgerAdapter({ rpcUrl: config.CKB_RPC_URL, indexerUrl: config.CKB_INDEXER_URL })
  : new InMemoryLedger();

if (ledger.resetDemo) await ledger.resetDemo();

createApp(ledger, config.WEB_ORIGIN).listen(config.PORT, () => {
  console.log(`[skillpass-api] listening on http://localhost:${config.PORT} (${config.LEDGER_MODE})`);
});
