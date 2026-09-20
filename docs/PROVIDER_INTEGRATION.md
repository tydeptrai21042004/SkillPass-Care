# Provider Integration

SkillPass Care providers combine two decisions:

```text
SkillPass / ownership decision
  current owner + fresh state + proof

AND

Care application decision
  active coverage + accepted provider + allowed service + enough units
```

A provider must not maintain an authoritative duplicate owner table.

## Service workflow

1. Identify the Care entitlement.
2. Request a short-lived owner challenge.
3. For service, bind `serviceEventId`, `serviceType` and `unitsConsumed`.
4. Obtain owner proof.
5. Resolve the latest ownership/coverage state.
6. Verify provider acceptance and Care plan policy.
7. Atomically record the service event and consume the requested units.
8. Keep signed authorization/service evidence.

## Idempotency

Use a stable provider-side event ID, for example:

```text
repair-order-2026-000123
```

Retries use the same event ID and same canonical request. Reusing that ID for a changed claimant, service type, unit count or request hash is a conflict.

## Service history privacy

Providers see only their own service-event history through the scoped API. The current owner and issuer can see the transferable event history required to understand remaining coverage. Do not place private technician notes, billing data or customer PII into the transferable record.

## Target SkillPass integration

When the main SkillPass testnet integration is connected, the provider verifier should use the canonical SkillPass owner/state reference while Care continues to enforce plan/quota/service-event rules. See `SKILLPASS_INTEGRATION.md`.
