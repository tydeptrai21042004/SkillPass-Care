#!/usr/bin/env node
import { readdir, readFile, access } from "node:fs/promises";

const failures = [];
const required = [
  ".env.example",
  ".gitignore",
  ".dockerignore",
  ".github/workflows/ci.yml",
  "skillpass.protocol.json",
  "api/router.ts",
  "docs/OWNER_PROOF.md",
  "docs/CKB_CELL_SCHEMA.md",
  "docs/SKILLPASS_INTEGRATION.md",
  "docs/SERVICE_EVENTS.md",
  "docs/DURABLE_STORE.md",
  "db/001_care_coverage.sql"
];
for (const file of required) {
  try { await access(file); } catch { failures.push(`missing required file: ${file}`); }
}

const apiFiles = (await readdir("api")).sort();
if (JSON.stringify(apiFiles) !== JSON.stringify(["router.ts"])) {
  failures.push(`api/ must contain only router.ts; found: ${apiFiles.join(", ")}`);
}

const protocol = JSON.parse(await readFile("skillpass.protocol.json", "utf8"));
if (protocol.canonicalProtocol !== "SkillPass") failures.push("skillpass.protocol.json canonicalProtocol must be SkillPass");
if (protocol.canonicalCapabilityVersion !== 2) failures.push("skillpass.protocol.json must target Capability V2");
if (protocol.mapping?.currentOwner !== "live Cell.lock (never Care application JSON)") {
  failures.push("skillpass.protocol.json must preserve live Cell.lock as the owner source of truth");
}

const packageFiles = [
  "package.json",
  ...(await readdir("apps", { withFileTypes: true })).filter((x) => x.isDirectory()).map((x) => `apps/${x.name}/package.json`),
  ...(await readdir("packages", { withFileTypes: true })).filter((x) => x.isDirectory()).map((x) => `packages/${x.name}/package.json`)
];
for (const file of packageFiles) {
  const pkg = JSON.parse(await readFile(file, "utf8"));
  if (pkg.version !== "0.5.0") failures.push(`${file} version is ${pkg.version}, expected 0.5.0`);
}

const vercel = JSON.parse(await readFile("vercel.json", "utf8"));
const functions = Object.keys(vercel.functions ?? {});
if (functions.length !== 1 || functions[0] !== "api/router.ts") failures.push("vercel.json must expose only api/router.ts");

if (failures.length) {
  console.error("Preflight failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Preflight OK: repository structure, protocol compatibility, versioning, and Vercel entrypoint are consistent.");
