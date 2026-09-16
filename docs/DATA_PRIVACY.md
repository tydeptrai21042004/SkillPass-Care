# Data Privacy

The pilot should avoid putting personal customer data on chain.

Recommended approach:

```text
raw product serial / invoice reference
          │
          ▼
normalized local representation
          │
          ▼
commitment/hash
          │
          ▼
ServiceRight.productHash
```

Keep names, phone numbers, addresses, repair notes and receipts in the business systems that already require them. SkillPass only needs enough information to identify the service entitlement and its current owner.

For a production pilot, define retention periods for provider audit logs and obtain consent for any user-research recordings or surveys.
