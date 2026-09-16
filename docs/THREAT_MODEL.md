# Threat Model

| Threat | Pilot mitigation | Production follow-up |
|---|---|---|
| Old owner retries after transfer | verify latest owner for every request | live Cell lookup + confirmation policy |
| User edits browser state | server/provider verifier is authoritative | signed request intents |
| Provider accepts wrong plan | provider allow-list + service class | signed manifests + policy versions |
| Claim count races | in-process serialized mutation | on-chain or durable atomic state machine |
| RPC/indexer unavailable | memory demo always available | fail closed + multi-endpoint strategy |
| Product identifier leakage | store hash only | salted/structured commitment scheme |
| Issuer key compromise | out of scope for demo | hardware/passkey custody + key rotation |
