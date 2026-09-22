import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { InMemoryLedger, InMemorySkillPassOwnership, SplitServiceRightLedger, CkbLedgerAdapter, type ServiceRightLedger } from "@skillpass-care/ckb-adapter";
import { InMemoryCareStore, PostgresCareStore } from "@skillpass-care/care-store";
import { loadConfig } from "@skillpass-care/config";
import { createApp } from "./app.js";

let cachedApp: ReturnType<typeof createApp> | undefined;
export function getRuntimeApp() {
  if (cachedApp) return cachedApp;
  if (process.env.NODE_ENV !== "production") { const rootEnv=fileURLToPath(new URL("../../../.env",import.meta.url)); try{loadEnvFile(rootEnv);}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;} }
  const config=loadConfig();
  let ledger:ServiceRightLedger;
  if(config.LEDGER_MODE==="ckb") {
    // Fail-closed until the main SkillPass canonical verifier/Cell resolver is configured in this deployment.
    ledger=new CkbLedgerAdapter({rpcUrl:config.CKB_RPC_URL,indexerUrl:config.CKB_INDEXER_URL});
  } else if(config.CARE_STORE_MODE==="postgres") {
    ledger=new SplitServiceRightLedger(new InMemorySkillPassOwnership(),new PostgresCareStore(config.DATABASE_URL));
  } else {
    ledger=new InMemoryLedger();
  }
  cachedApp=createApp(ledger,{webOrigins:config.WEB_ORIGINS,demoEnabled:config.ENABLE_DEMO_ENDPOINTS,demoSessionSecret:config.DEMO_SESSION_SECRET,ownerProofChallengeSecret:config.OWNER_PROOF_CHALLENGE_SECRET,ownerProofTtlSeconds:config.OWNER_PROOF_TTL_SECONDS,secureDemoCookies:config.NODE_ENV==="production",credentials:{issuers:config.ISSUER_KEYS,providers:config.PROVIDER_KEYS,owners:config.OWNER_KEYS}});
  return cachedApp;
}
