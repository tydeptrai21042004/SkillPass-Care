#!/usr/bin/env node
import { readdir, readFile, access } from "node:fs/promises";

const failures = [];
const required = [".env.example", ".gitignore", "api/router.ts", "docs/OWNER_PROOF.md", "docs/CKB_CELL_SCHEMA.md"];
for (const file of required) {
  try { await access(file); } catch { failures.push(`missing required file: ${file}`); }
}

const apiFiles = (await readdir("api")).sort();
if (JSON.stringify(apiFiles) !== JSON.stringify(["router.ts"])) {
  failures.push(`api/ must contain only router.ts; found: ${apiFiles.join(", ")}`);
}

const packageFiles = ["package.json", ...(await readdir("apps", { withFileTypes: true })).filter(x => x.isDirectory()).map(x => `apps/${x.name}/package.json`), ...(await readdir("packages", { withFileTypes: true })).filter(x => x.isDirectory()).map(x => `packages/${x.name}/package.json`)];
for (const file of packageFiles) {
  const pkg = JSON.parse(await readFile(file, "utf8"));
  if (pkg.version !== "0.4.0") failures.push(`${file} version is ${pkg.version}, expected 0.4.0`);
}

const vercel = JSON.parse(await readFile("vercel.json", "utf8"));
const functions = Object.keys(vercel.functions ?? {});
if (functions.length !== 1 || functions[0] !== "api/router.ts") failures.push("vercel.json must expose only api/router.ts");

if (failures.length) {
  console.error("Preflight failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Preflight OK: repository structure, versioning, and Vercel entrypoint are consistent.");
