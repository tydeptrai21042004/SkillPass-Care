# v0.5 changed-files patch

## Apply

Overlay this patch onto the existing SkillPass Care repository, then run:

Linux/macOS:

```bash
bash apply-fix.sh
```

Windows PowerShell:

```powershell
./apply-fix.ps1
```

The apply script removes the two stale Vercel routes that cannot be represented by a normal overlay ZIP:

```text
api/[...path].ts
api/index.ts
```

## Main change groups

- Care package namespace separated as `@skillpass-care/*`.
- Care plans and service types added.
- typed service-event history and provider-scoped reads added.
- service type + unit count bound into owner proof and idempotency.
- flagship Alice -> Provider A -> Bob -> Provider B continuity flow added.
- durable PostgreSQL Care-state reference schema added.
- SkillPass ownership vs Care coverage responsibilities documented.
- release/preflight/CI files corrected.

## Verification performed while preparing the patch

```text
repository preflight: PASS
Care boundary verifier: PASS
TypeScript syntax transpile: 36/36 source files clean
manual runtime Care lifecycle: PASS
  Alice diagnostic: 3 -> 2
  Alice -> Bob transfer: coverage stays 2
  stale Alice service: rejected
  Bob repair at Provider B: 2 -> 1
  service events preserved: 2
```

The dependency-backed `npm run check` was not executed in the preparation environment because npm registry DNS access returned `EAI_AGAIN`. Run it after dependency installation in your normal networked environment.
