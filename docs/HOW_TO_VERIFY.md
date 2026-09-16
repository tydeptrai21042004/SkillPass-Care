# How to Verify

This document is written for reviewers.

## 1. Install

```bash
cp .env.example .env
npm install
```

## 2. Run tests

```bash
npm test
```

The core tests cover:

- issuance,
- current-owner authorization,
- transfer,
- old-owner rejection,
- new-owner authorization,
- provider allow-list enforcement,
- claim exhaustion.

## 3. Run the demo

```bash
npm run dev
```

Open `http://localhost:5173` and follow the lifecycle shown on screen.

## 4. API-only verification

Health:

```bash
curl http://localhost:8787/health
```

Seed demo state:

```bash
curl -X POST http://localhost:8787/demo/reset
```

List entitlements:

```bash
curl http://localhost:8787/entitlements
```

## 5. What this proves

The local environment proves the application and provider-verification invariants independent of a blockchain node.

It does **not** prove production CKB finality, indexer behavior, key security, or transaction construction. Those are explicit testnet milestones in `ROADMAP.md`.
