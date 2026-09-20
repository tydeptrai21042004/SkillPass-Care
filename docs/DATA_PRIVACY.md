# Data and Privacy

SkillPass Care should put the minimum necessary entitlement state in shared/on-chain storage.

## Product commitment

The entitlement stores `ServiceRight.productCommitment`, not a raw serial number. the pilot requires the format:

```text
sha256:<64 lowercase/uppercase hex digits>
```

Recommended construction:

```text
SHA256(
  "SKILLPASS_PRODUCT_V1" || 0x00 ||
  issuerNamespace        || 0x00 ||
  privateProductId       || 0x00 ||
  randomSalt
)
```

The repository helper `npm run product:commitment -- <namespace> <product-id> [salt]` implements this domain-separated form. A random salt prevents straightforward dictionary matching of predictable serial numbers.

## Avoid shared storage of

- customer name, phone, email or address;
- repair notes not needed for authorization;
- owner shared secrets/private keys;
- raw physical serial numbers when a salted commitment is sufficient.

## Ownership privacy boundary

The off-chain pilot exposes symbolic principals such as `alice` only for demonstration. A CKB implementation derives the authoritative owner from the current live Cell lock; public-chain privacy properties depend on the lock/address model and are not solved by this prototype.
