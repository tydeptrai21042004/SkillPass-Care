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
  "skillpass.protocol.json",
  "docs/SKILLPASS_INTEGRATION.md",
  "docs/SERVICE_EVENTS.md",
  "docs/NON_GOALS.md",
  "packages/core/src/plans.ts",
  "packages/shared/src/index.ts",
  "packages/care-store/src/domain.ts",
  "apps/api/src/runtime.ts",
  "apps/api/src/app.ts"
]) {
  try { await access(file); } catch { failures.push(`missing Care architecture file: ${file}`); }
}

await mustContain("packages/core/src/model.ts", ["remainingClaims", "productCommitment", "acceptedProviderIds"]);
await mustContain("packages/shared/src/index.ts", ["ServiceEventRecord", "serviceType", "unitsConsumed", "ownershipMode", "careStoreMode"]);
await mustContain("packages/care-store/src/postgres.ts", ["applyCareConsumption", "applyCareStatusTransition", "FOR UPDATE", "assertStateRefCurrent"]);
await mustContain("apps/api/src/runtime.ts", ["canonicalOwnership", "SplitServiceRightLedger", "PostgresCareStore"]);
await mustContain("apps/api/src/app.ts", ["/entitlements/:id/service-events", "listServiceEvents", "serviceTypeAndUnitsBoundToOwnerProof"]);
await mustContain("docs/SKILLPASS_INTEGRATION.md", ["SkillPass responsibility", "SkillPass Care responsibility", "CanonicalSkillPassOwnership", "PostgresCareStore"]);
await mustContain("docs/CKB_CELL_SCHEMA.md", ["does **not** put all mutable SkillPass Care business state", "Legacy prototype codec"]);
await mustContain("README.md", ["STANDARD_90D issued to Alice", "Provider B", "@skillpass-care/*", "No shared entitlement-owner database"]);

const protocol = JSON.parse(await readFile("skillpass.protocol.json", "utf8"));
if (protocol.canonicalProtocol !== "SkillPass" || protocol.canonicalCapabilityVersion !== 2) {
  failures.push("skillpass.protocol.json must target canonical SkillPass Capability V2");
}
if (protocol.mapping?.currentOwner !== "live Cell.lock (never Care application JSON)") {
  failures.push("Care owner-authority contract changed");
}

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
console.log("- Care retains product/coverage/service lifecycle state only");
console.log("- memory and PostgreSQL share Care domain transitions");
console.log("- canonical SkillPass ownership can compose with the Care store");
console.log("- Capability V2 compatibility is machine-readable");
console.log("- legacy Vercel API entrypoints are absent");
