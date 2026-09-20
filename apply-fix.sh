#!/usr/bin/env bash
set -euo pipefail
rm -f 'api/[...path].ts' 'api/index.ts'
echo "Removed stale Vercel entrypoints."
node scripts/preflight.mjs
node scripts/verify-care-boundary.mjs
echo "SkillPass Care changed-files patch applied successfully."
