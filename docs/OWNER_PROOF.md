# Owner Proof-of-Possession

## Why it exists

A provider must not authorize service because it received a caller-supplied `claimant` string. The pilot requires proof that the claimant controls the configured owner credential. The target integration replaces the pilot secret with a wallet signature tied to the current SkillPass owner.

## Canonical message

```text
SKILLPASS_OWNER_PROOF_V1
challengeId=<uuid>
action=<VERIFY|CLAIM>
entitlementId=<id>
providerId=<provider>
claimant=<owner>
serviceEventId=<empty for VERIFY>
serviceType=<empty for VERIFY>
unitsConsumed=<empty for VERIFY>
issuedAt=<ISO time>
expiresAt=<ISO time>
```

For a Care service request, `serviceEventId`, `serviceType` and `unitsConsumed` are all signed. This prevents an approved one-unit diagnostic request from being transformed into a different or larger service request after owner approval.

## Fresh-state rule

Proof-of-possession is necessary but not sufficient. After validating the proof, the provider still resolves the latest ownership/coverage state immediately before authorization or service-event commit. A proof made by Alice before an Alice -> Bob transfer must not authorize Alice after the transfer.

## Pilot vs target

Pilot:

```text
ownerProof = HMAC-SHA256(ownerSharedSecret, canonicalMessage)
```

Target:

```text
ownerProof = WalletSign(keyControllingCurrentSkillPassOwner, canonicalMessage)
```
