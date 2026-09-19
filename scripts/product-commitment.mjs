#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";

const [namespace, productId, suppliedSalt] = process.argv.slice(2);
if (!namespace || !productId) {
  console.error("Usage: node scripts/product-commitment.mjs <issuer-namespace> <product-id> [salt]");
  process.exit(1);
}
const salt = suppliedSalt || randomBytes(16).toString("hex");
const preimage = ["SKILLPASS_PRODUCT_V1", namespace, productId, salt].join("\0");
const digest = createHash("sha256").update(preimage, "utf8").digest("hex");
console.log(JSON.stringify({ salt, productCommitment: `sha256:${digest}` }, null, 2));
