# Owner Proof-of-Possession

## Why it exists

Checking `right.owner === request.claimant` is insufficient when `claimant` is only a provider-supplied string. v0.4 requires proof that the claimant controls the configured pilot owner credential.

## Canonical message

```text
SKILLPASS_OWNER_PROOF_V1
challengeId=<uuid>
action=<VERIFY|CLAIM>
entitlementId=<id>
providerId=<provider>
claimant=<owner>
serviceEventId=<empty for VERIFY, stable ID for CLAIM>
issuedAt=<ISO time>
expiresAt=<ISO time>
```

The server signs the challenge payload to prevent field modification. The owner proof signs the canonical message.

## Pilot vs target

Pilot:

```text
ownerProof = HMAC-SHA256(ownerSharedSecret, canonicalMessage)
```

CKB target:

```text
ownerProof = WalletSign(ownerKeyControllingLiveCellLock, canonicalMessage)
```

The message shape is intentionally domain-separated and request-bound so the authentication mechanism can change without changing authorization semantics.
