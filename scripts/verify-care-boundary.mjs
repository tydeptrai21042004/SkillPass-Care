#!/usr/bin/env node
import { access, readFile, readdir } from "node:fs/promises";

const failures = [];
const mustContain = async (file, fragments) => {
  const text = await readFile(file, "utf8");
  for (const fragment of fragments) {
    if (!text.includes(fragment)) failures.push(`${file} missing required boundary marker: ${fragment}`);
  }
};

for (const file of [
  "docs/SKILLPASS_INTEGRATION.md",
  "docs/SERVICE_EVENTS.md",
  "packages/core/src/plans.ts",
  "packages/shared/src/index.ts",
  "apps/api/src/app.ts"
]) {
  try { await access(file); } catch { failures.push(`missing Care architecture file: ${file}`); }
}

await mustContain("packages/core/src/model.ts", ["remainingClaims", "productCommitment", "acceptedProviderIds"]);
await mustContain("packages/shared/src/index.ts", ["ServiceEventRecord", "serviceType", "unitsConsumed"]);
await mustContain("apps/api/src/app.ts", ["/entitlements/:id/service-events", "listServiceEvents", "serviceTypeAndUnitsBoundToOwnerProof"]);
await mustContain("docs/SKILLPASS_INTEGRATION.md", ["SkillPass responsibility", "SkillPass Care responsibility", "coverage", "service-event"]);
await mustContain("docs/CKB_CELL_SCHEMA.md", ["does **not** put all mutable SkillPass Care business state", "Legacy prototype codec"]);
await mustContain("README.md", ["STANDARD_90D issued to Alice", "Provider B", "@skillpass-care/*"]);

const packages = [
  "apps/api/package.json", "apps/web/package.json",
  "packages/shared/package.json", "packages/core/package.json",
  "packages/ckb-adapter/package.json", "packages/provider-sdk/package.json", "packages/config/package.json"
];
for (const file of packages) {
  const pkg = JSON.parse(await readFile(file, "utf8"));
  if (!String(pkg.name).startsWith("@skillpass-care/")) {
    failures.push(`${file} must use the @skillpass-care/* application namespace`);
  }
}

const apiFiles = (await readdir("api")).sort();
if (apiFiles.join(",") !== "router.ts") failures.push(`legacy API entrypoints remain: ${apiFiles.join(", ")}`);

if (failures.length) {
  console.error("Care boundary verification failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Care boundary verification OK:");
console.log("- Care retains product/coverage/service lifecycle state");
console.log("- typed service events and request binding are present");
console.log("- SkillPass/Care responsibilities are explicitly separated");
console.log("- workspace packages use @skillpass-care/* namespace");
console.log("- legacy Vercel API entrypoints are absent");
