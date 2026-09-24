$ErrorActionPreference = "Stop"
Remove-Item -LiteralPath "api/[...path].ts" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "api/index.ts" -Force -ErrorAction SilentlyContinue
Write-Host "Removed stale Vercel entrypoints."
node scripts/preflight.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/verify-care-boundary.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "SkillPass Care canonical-ownership/durable-state patch applied successfully."
