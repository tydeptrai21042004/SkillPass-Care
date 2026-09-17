#!/usr/bin/env bash
set -euo pipefail

rm -f 'api/[...path].ts' 'api/index.ts'

echo "Removed stale Vercel API entrypoints:"
echo "  api/[...path].ts"
echo "  api/index.ts"
echo
echo "The fixed api/router.ts and vercel.json should already be present."
