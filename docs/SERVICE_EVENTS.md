# Care Service Events

A Care service event is the audit record for coverage consumption. It is separate from the portable ownership object.

## Event schema

```ts
interface ServiceEventRecord {
  eventVersion: 1;
  eventId: string;
  entitlementId: string;
  providerId: string;
  claimant: string;
  serviceType:
    | "DIAGNOSTIC"
    | "INSPECTION"
    | "REPAIR"
    | "REPLACEMENT"
    | "BATTERY_REPLACEMENT";
  unitsConsumed: number;
  requestHash: string;
  entitlementVersionBefore: number;
  entitlementVersionAfter: number;
  remainingClaimsAfter: number;
  occurredAt: string;
}
```

## Why events exist

A single mutable `remainingClaims` value is not enough for a credible service product. Events provide:

- an audit trail of which provider consumed coverage;
- replay-safe retries via `providerId + eventId`;
- cross-owner continuity after resale;
- cross-provider continuity;
- a basis for reconstructing or auditing remaining coverage;
- a clean boundary between SkillPass ownership and Care business state.

The in-memory pilot still caches `remainingClaims` on the entitlement for simplicity. A durable implementation should persist service events transactionally and may derive or verify the cached remaining balance from committed events.

## Actor-scoped history

`GET /entitlements/:id/service-events` follows the same privacy model as entitlement reads:

- current owner — may see the transferable service history needed to understand remaining coverage;
- issuer — may see events for its issued coverage;
- provider — sees only events created by that provider.

Detailed private technician notes or billing information should not be included in the transferable event record.

## Race-safety rule

A service event must be rejected if ownership changes after the proof was issued but before the event commits. The test suite includes a pre-transfer proof / post-transfer commit attempt and requires `WRONG_OWNER` or equivalent stale-state rejection.
