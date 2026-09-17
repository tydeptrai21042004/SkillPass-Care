#!/usr/bin/env bash
set -euo pipefail

# SkillPass Care environment/key generator
#
# Usage:
#   chmod +x generate-env.sh
#   ./generate-env.sh
#
# Optional:
#   ./generate-env.sh .env.production
#   ./generate-env.sh --force
#   ./generate-env.sh .env.production --force
#
# The generated file is mode 600 and should NEVER be committed to Git.

OUTPUT=".env"
FORCE="false"

for arg in "$@"; do
  case "$arg" in
    --force)
      FORCE="true"
      ;;
    -h|--help)
      cat <<'EOF'
SkillPass Care environment generator

Usage:
  ./generate-env.sh [output-file] [--force]

Examples:
  ./generate-env.sh
  ./generate-env.sh .env.production
  ./generate-env.sh .env.production --force

Generates:
  DEMO_SESSION_SECRET
  ISSUER_KEYS
  PROVIDER_KEYS
  OWNER_KEYS

The secrets are random hexadecimal values suitable for the project's
id:secret,id:secret credential-map format.
EOF
      exit 0
      ;;
    -*)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
    *)
      OUTPUT="$arg"
      ;;
  esac
done

if [[ -e "$OUTPUT" && "$FORCE" != "true" ]]; then
  echo "Refusing to overwrite existing file: $OUTPUT" >&2
  echo "Use --force if you really want to replace it." >&2
  exit 1
fi

# Restrictive permissions for newly created files.
umask 077

random_hex() {
  local bytes="${1:-32}"

  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$bytes"
    return
  fi

  if [[ -r /dev/urandom ]] && command -v od >/dev/null 2>&1; then
    od -An -N"$bytes" -tx1 /dev/urandom | tr -d ' \n'
    return
  fi

  echo "Error: need either 'openssl' or /dev/urandom + 'od' to generate secure secrets." >&2
  exit 1
}

# 48 random bytes (96 hex chars) for the signed public-demo session.
DEMO_SESSION_SECRET="$(random_hex 48)"

# 32 random bytes (64 hex chars) per API actor key.
ISSUER_SECRET="$(random_hex 32)"
PROVIDER_A_SECRET="$(random_hex 32)"
PROVIDER_B_SECRET="$(random_hex 32)"
ALICE_SECRET="$(random_hex 32)"
BOB_SECRET="$(random_hex 32)"

cat > "$OUTPUT" <<EOF
# ============================================================
# SkillPass Care
# Generated automatically by generate-env.sh
# DO NOT COMMIT THIS FILE.
# ============================================================

# Runtime
# Keep production semantics at runtime. Vercel installation is configured
# separately to include TypeScript/build-time devDependencies.
NODE_ENV=production
PORT=8787

# Same-origin Vercel deployment: leave empty.
WEB_ORIGINS=

# ------------------------------------------------------------
# Public demo
# ------------------------------------------------------------
ENABLE_DEMO_ENDPOINTS=true
DEMO_SESSION_SECRET=${DEMO_SESSION_SECRET}

# ------------------------------------------------------------
# Ledger
# ------------------------------------------------------------
# memory = public demo / local single-process pilot
# ckb    = current fail-closed CKB adapter/probe
LEDGER_MODE=memory

CKB_RPC_URL=https://testnet.ckbapp.dev
CKB_INDEXER_URL=https://testnet.ckbapp.dev

# ------------------------------------------------------------
# Authenticated API actor credentials
#
# Format required by the project:
#   id:secret,id:secret
#
# These credentials are not required by /demo routes, but are
# generated now so authenticated API testing can be enabled safely.
# ------------------------------------------------------------
ISSUER_KEYS=seller-demo:${ISSUER_SECRET}
PROVIDER_KEYS=repair-a:${PROVIDER_A_SECRET},repair-b:${PROVIDER_B_SECRET}
OWNER_KEYS=alice:${ALICE_SECRET},bob:${BOB_SECRET}
EOF

chmod 600 "$OUTPUT" 2>/dev/null || true

echo
echo "SkillPass Care environment created:"
echo "  $OUTPUT"
echo
echo "Generated securely:"
echo "  - DEMO_SESSION_SECRET"
echo "  - 1 issuer API key"
echo "  - 2 provider API keys"
echo "  - 2 owner API keys"
echo
echo "IMPORTANT:"
echo "  1. Do not commit $OUTPUT to Git."
echo "  2. Store production secrets in Vercel Environment Variables."
echo "  3. Keep ENABLE_DEMO_ENDPOINTS=true only for the public demo."
echo "  4. The memory ledger is not durable production entitlement storage."
echo
echo "To inspect variable NAMES without printing secret values:"
echo "  cut -d= -f1 '$OUTPUT' | grep -v '^#' | grep -v '^$'"
