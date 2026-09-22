import { describe, expect, it } from "vitest";
import { InMemoryLedger } from "../src/index.js";

const hash=(c:string)=>`sha256:${c.repeat(64)}`;
describe("Alice -> Provider A -> transfer -> Bob -> Provider B",()=>{
  it("preserves Care quota/history while ownership follows SkillPass stateRef",async()=>{
    const ledger=new InMemoryLedger();
    const issued=await ledger.issue({id:"ent-flow",issuerId:"seller",productCommitment:hash("a"),owner:"alice",serviceClass:"STANDARD_90D",remainingClaims:3,expiresAt:"2099-01-01T00:00:00.000Z",transferable:true,acceptedProviderIds:["repair-a","repair-b"]});
    const aliceRef=issued.ownershipStateRef;
    const aEvidence=await ledger.ownership!.authorize({entitlementId:issued.id,claimant:"alice",providerId:"repair-a",requestHash:hash("b")});
    const afterA=await ledger.claim(issued.id,"alice","repair-a",{expectedVersion:1,serviceEventId:"a-1",requestHash:hash("b"),serviceType:"DIAGNOSTIC",unitsConsumed:1,authorizationEvidence:aEvidence});
    expect(afterA.remainingClaims).toBe(2);
    const bob=await ledger.transfer(issued.id,"alice","bob",{expectedVersion:afterA.version});
    expect(bob.owner).toBe("bob"); expect(bob.ownershipStateRef).not.toBe(aliceRef); expect(bob.remainingClaims).toBe(2);
    await expect(ledger.ownership!.assertStateRefCurrent(aliceRef)).rejects.toThrow("no longer live");
    const stale={...aEvidence,requestHash:hash("c")};
    await expect(ledger.claim(issued.id,"alice","repair-a",{expectedVersion:2,serviceEventId:"a-stale",requestHash:hash("c"),serviceType:"REPAIR",unitsConsumed:1,authorizationEvidence:stale})).rejects.toThrow();
    expect((await ledger.get(issued.id))?.remainingClaims).toBe(2);
    const bEvidence=await ledger.ownership!.authorize({entitlementId:issued.id,claimant:"bob",providerId:"repair-b",requestHash:hash("d")});
    const afterB=await ledger.claim(issued.id,"bob","repair-b",{expectedVersion:2,serviceEventId:"b-1",requestHash:hash("d"),serviceType:"REPAIR",unitsConsumed:1,authorizationEvidence:bEvidence});
    expect(afterB.remainingClaims).toBe(1);
    const events=await ledger.listServiceEvents(issued.id);
    expect(events.map(e=>[e.claimant,e.providerId,e.authorizationStateRef])).toEqual([["alice","repair-a",aliceRef],["bob","repair-b",bob.ownershipStateRef]]);
  });
});
