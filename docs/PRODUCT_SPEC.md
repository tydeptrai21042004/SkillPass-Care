# Product Specification

## Product statement

SkillPass Care makes **remaining service coverage portable across resale**. A product can receive service from one accepted provider under the first owner, transfer to a second owner, and continue the remaining coverage at another accepted provider without treating each provider's customer database as the source of ownership truth.

## What makes Care more than a SkillPass demo

SkillPass supplies the portable ownership primitive. Care adds the vertical product layer:

- product commitment;
- versioned Care plans;
- service types and coverage units;
- service-event history;
- issuer suspend/resume/revoke controls;
- provider-scoped service execution;
- transfer-aware continuity;
- privacy-scoped history;
- user/provider/issuer workflows.

## Flagship lifecycle

```text
Seller issues STANDARD_90D: 3 units to Alice
  -> Provider A verifies Alice
  -> diagnostic consumes 1 unit
Alice: 2 units remaining
  -> Alice transfers SkillPass right to Bob
  -> Alice is rejected
  -> Provider B verifies Bob
  -> repair consumes 1 unit
Bob: 1 unit remaining
```

Coverage is not reset by the ownership transfer, and service history is preserved.

## Actors

- **Issuer/seller** — issues coverage, selects the plan/provider network, and may suspend/resume/revoke under policy.
- **Current entitlement owner** — proves control, consumes covered service, and may transfer a transferable right.
- **Service provider** — independently verifies the current owner and Care policy immediately before service.

## Built-in pilot plans

- `STANDARD_90D` — 3 units; diagnostic, inspection, repair.
- `PREMIUM_365D` — 5 units; broader repair/replacement coverage.
- `BATTERY_180D` — 1 battery-replacement unit.

These are reference policies for the pilot, not a claim that every commercial deployment should use the same terms.

## Explicit boundary

For a normal physical item, SkillPass Care does **not** automatically prove physical possession. The protocol proves control of the service entitlement associated with a product commitment. A pilot operationally pairs product handoff and entitlement transfer.

## Non-goals for this funding scope

No marketplace, tokenomics, reputation layer, DID product, mandatory crypto checkout, AI-agent marketplace, legal-warranty automation, or mainnet production claim is required to validate the core product hypothesis.

## Success signal

A real second owner receives covered service from an independently operated accepted provider using remaining coverage that was partly consumed before transfer, without manual provider-to-provider ownership-table synchronization.
