import { describe, expect, it } from "vitest";
import { InMemoryCareStore } from "../src/index.js";

describe("CareCoverageStore split boundary",()=>{
  it("rolls back logically when the SkillPass stateRef becomes stale before commit",async()=>{
    const store=new InMemoryCareStore();
    const coverage=await store.create({id:"ent-1",issuerId:"seller",productCommitment:`sha256:${"a".repeat(64)}`,serviceClass:"STANDARD_90D",remainingClaims:2,expiresAt:"2099-01-01T00:00:00.000Z",transferable:true,acceptedProviderIds:["repair-a"]});
    let checks=0;
    await expect(store.consume("ent-1",{claimant:"alice",providerId:"repair-a",authorizationStateRef:`ckb:testnet:0x${"1".repeat(64)}:0`,authorizationEvidenceHash:`sha256:${"2".repeat(64)}`,assertStateRefCurrent:async()=>{checks++;if(checks===2)throw new Error("STATE_REF_STALE");}},{expectedVersion:coverage.version,serviceEventId:"evt-1",requestHash:`sha256:${"3".repeat(64)}`,serviceType:"DIAGNOSTIC",unitsConsumed:1})).rejects.toThrow("STATE_REF_STALE");
    expect((await store.get("ent-1"))?.remainingClaims).toBe(2);
    expect(await store.listServiceEvents("ent-1")).toHaveLength(0);
  });
});
