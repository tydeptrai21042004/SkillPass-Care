import { describe, expect, it } from "vitest";
import { CARE_PLANS, listCarePlans, resolveCarePlan } from "../src/index.js";


describe("Care plans", () => {
  it("defines a transferable multi-provider-friendly standard plan", () => {
    const plan = resolveCarePlan("STANDARD_90D");
    expect(plan).toBeDefined();
    expect(plan?.initialUnits).toBe(3);
    expect(plan?.transferable).toBe(true);
    expect(plan?.allowedServiceTypes).toContain("DIAGNOSTIC");
    expect(plan?.allowedServiceTypes).toContain("REPAIR");
  });

  it("returns defensive plan copies to callers", () => {
    const plans = listCarePlans();
    expect(plans).toHaveLength(Object.keys(CARE_PLANS).length);
    plans[0].allowedServiceTypes.push("REPLACEMENT");
    expect(listCarePlans()[0].allowedServiceTypes).not.toEqual(plans[0].allowedServiceTypes);
  });
});
