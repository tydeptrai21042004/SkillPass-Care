import { loadConfig } from "@skillpass-care/config";
import { getRuntimeApp } from "./runtime.js";

const app = getRuntimeApp();
const config = loadConfig();

app.listen(config.PORT, () => {
  console.log(`[skillpass-api] listening on http://localhost:${config.PORT} (${config.LEDGER_MODE})`);
  if (config.ENABLE_DEMO_ENDPOINTS) {
    console.log("[skillpass-api] stateless public demo endpoints enabled under /demo/*");
  }
  if (config.LEDGER_MODE === "ckb") {
    console.warn("[skillpass-api] CKB mode is fail-closed until the SkillPass Cell schema/write path is implemented");
  }
});
