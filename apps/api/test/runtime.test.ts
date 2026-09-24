import { describe, expect, it } from "vitest";
import { CkbLedgerAdapter, SplitServiceRightLedger, type SkillPassOwnershipPort } from "@skillpass-care/ckb-adapter";
import { loadConfig } from "@skillpass-care/config";
import type { AuthorizationEvidence } from "@skillpass-care/shared";
import { createRuntimeLedger } from "../src/runtime.js";

const stateRef = `ckb:testnet:0x${"7".repeat(64)}:0`;

const canonicalOwnership: SkillPassOwnershipPort = {
  async resolve(entitlementId) { return { entitlementId, owner: "alice", stateRef, transferable: true }; },
  async authorize(request): Promise<AuthorizationEvidence> {
    return {
      evidenceVersion: 1,
      allowed: true,
      reason: "ALLOW",
      entitlementId: request.entitlementId,
      providerId: request.providerId,
      claimant: request.claimant,
      requestHash: request.requestHash,
      verifiedAt: "2026-09-24T00:00:00.000Z",
      expiresAt: "2026-09-24T00:05:00.000Z",
      stateRef
    };
  },
  async assertStateRefCurrent() {},
  async health() { return { mode: "ckb", ownershipMode: "ckb", ready: true, detail: "test canonical ownership" }; }
};

describe("runtime ledger composition", () => {
  it("composes canonical SkillPass ownership with the selected Care store when a production binding is injected", async () => {
    const config = loadConfig({ NODE_ENV: "test", LEDGER_MODE: "ckb", CARE_STORE_MODE: "memory" });
    const ledger = createRuntimeLedger(config, { canonicalOwnership });
    expect(ledger).toBeInstanceOf(SplitServiceRightLedger);
    expect(ledger.ownership).toBe(canonicalOwnership);
    expect(await ledger.health()).toMatchObject({
      ready: true,
      ownershipMode: "ckb",
      careStoreMode: "memory"
    });
  });

  it("remains fail-closed in CKB mode when no canonical verifier binding is configured", () => {
    const config = loadConfig({ NODE_ENV: "test", LEDGER_MODE: "ckb", CARE_STORE_MODE: "memory" });
    expect(createRuntimeLedger(config)).toBeInstanceOf(CkbLedgerAdapter);
  });
});
