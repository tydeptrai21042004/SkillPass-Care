import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import {
  CkbLedgerAdapter,
  InMemoryLedger,
  InMemorySkillPassOwnership,
  SplitServiceRightLedger,
  type ServiceRightLedger,
  type SkillPassOwnershipPort
} from "@skillpass-care/ckb-adapter";
import { InMemoryCareStore, PostgresCareStore, type CareCoverageStore } from "@skillpass-care/care-store";
import { loadConfig, type AppConfig } from "@skillpass-care/config";
import { createApp } from "./app.js";

export interface RuntimeDependencies {
  /**
   * Production host injection point for the canonical SkillPass ownership
   * adapter. When present with LEDGER_MODE=ckb, Care composes it with the
   * selected Care store instead of using the fail-closed placeholder adapter.
   */
  canonicalOwnership?: SkillPassOwnershipPort;
  /** Test/custom-host override. Normal deployments derive this from CARE_STORE_MODE. */
  careStore?: CareCoverageStore;
}

let cachedApp: ReturnType<typeof createApp> | undefined;

export function createRuntimeLedger(config: AppConfig, dependencies: RuntimeDependencies = {}): ServiceRightLedger {
  const care = dependencies.careStore ?? (
    config.CARE_STORE_MODE === "postgres"
      ? new PostgresCareStore(config.DATABASE_URL)
      : new InMemoryCareStore()
  );

  if (config.LEDGER_MODE === "ckb") {
    if (dependencies.canonicalOwnership) {
      return new SplitServiceRightLedger(dependencies.canonicalOwnership, care);
    }
    // Default Vercel/API deployment remains fail-closed until a canonical
    // SkillPass verifier binding is deliberately injected by the production host.
    return new CkbLedgerAdapter({ rpcUrl: config.CKB_RPC_URL, indexerUrl: config.CKB_INDEXER_URL });
  }

  if (config.CARE_STORE_MODE === "postgres" || dependencies.careStore) {
    return new SplitServiceRightLedger(new InMemorySkillPassOwnership(), care);
  }
  return new InMemoryLedger();
}

export function createRuntimeApp(dependencies: RuntimeDependencies = {}) {
  loadLocalEnv();
  const config = loadConfig();
  const ledger = createRuntimeLedger(config, dependencies);
  return createApp(ledger, {
    webOrigins: config.WEB_ORIGINS,
    demoEnabled: config.ENABLE_DEMO_ENDPOINTS,
    demoSessionSecret: config.DEMO_SESSION_SECRET,
    ownerProofChallengeSecret: config.OWNER_PROOF_CHALLENGE_SECRET,
    ownerProofTtlSeconds: config.OWNER_PROOF_TTL_SECONDS,
    secureDemoCookies: config.NODE_ENV === "production",
    credentials: {
      issuers: config.ISSUER_KEYS,
      providers: config.PROVIDER_KEYS,
      owners: config.OWNER_KEYS
    }
  });
}

export function getRuntimeApp() {
  if (!cachedApp) cachedApp = createRuntimeApp();
  return cachedApp;
}

function loadLocalEnv() {
  if (process.env.NODE_ENV === "production") return;
  const rootEnv = fileURLToPath(new URL("../../../.env", import.meta.url));
  try {
    loadEnvFile(rootEnv);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
