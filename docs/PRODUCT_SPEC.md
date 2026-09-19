# Product Specification

## Product statement

SkillPass Care makes a remaining service entitlement portable when a second-hand product is sold and lets accepted providers verify who currently controls that entitlement without relying on one provider-owned customer-entitlement table.

## Actors

- **Issuer/seller** — creates coverage and provider acceptance policy.
- **Current entitlement owner** — proves control, uses service and may transfer a transferable right.
- **Service provider** — resolves current state and verifies owner proof before serving.

## Core user stories

1. Seller issues time/claim-limited service coverage.
2. Owner proves entitlement control without a provider trusting a typed username.
3. Provider verifies current state immediately before service.
4. Owner transfers the service right to a buyer as part of the product sale.
5. Previous owner becomes ineligible after the state transition.
6. New owner can use remaining coverage at another accepted provider.
7. Retried service-claim requests do not consume coverage twice.

## Explicit boundary

For a normal physical item, SkillPass does **not** automatically prove physical ownership. The protocol proves control of the service entitlement. A pilot must operationally pair product handoff and service-right transfer.

## Non-goals

No marketplace, reputation layer, DID product, mandatory crypto checkout, AI-agent platform, legal-warranty automation or mainnet claim is needed to validate the core protocol.

## Success signal

A real second owner receives service from an independently operated accepted provider using the transferred entitlement, with no manual shared entitlement-table reconciliation and with auditable proof of the authorization decision.
