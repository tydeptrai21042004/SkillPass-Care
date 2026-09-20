import type { CareServiceType } from "@skillpass-care/shared";

/**
 * Care-specific coverage plans. These are application policy, not SkillPass
 * ownership semantics. A future SkillPass capability can commit to a canonical
 * Care plan hash while Care continues to interpret the policy itself.
 */
export interface CarePlan {
  id: string;
  name: string;
  durationDays: number;
  initialUnits: number;
  allowedServiceTypes: CareServiceType[];
  transferable: boolean;
}

export const CARE_PLANS: Record<string, CarePlan> = {
  STANDARD_90D: {
    id: "STANDARD_90D",
    name: "90-day Standard Care",
    durationDays: 90,
    initialUnits: 3,
    allowedServiceTypes: ["DIAGNOSTIC", "INSPECTION", "REPAIR"],
    transferable: true
  },
  PREMIUM_365D: {
    id: "PREMIUM_365D",
    name: "365-day Premium Care",
    durationDays: 365,
    initialUnits: 5,
    allowedServiceTypes: ["DIAGNOSTIC", "INSPECTION", "REPAIR", "REPLACEMENT", "BATTERY_REPLACEMENT"],
    transferable: true
  },
  BATTERY_180D: {
    id: "BATTERY_180D",
    name: "180-day Battery Care",
    durationDays: 180,
    initialUnits: 1,
    allowedServiceTypes: ["BATTERY_REPLACEMENT"],
    transferable: true
  }
};

export function resolveCarePlan(serviceClass: string): CarePlan | undefined {
  const plan = CARE_PLANS[serviceClass];
  return plan ? clonePlan(plan) : undefined;
}

export function listCarePlans(): CarePlan[] {
  return Object.values(CARE_PLANS).map(clonePlan);
}

function clonePlan(plan: CarePlan): CarePlan {
  return { ...plan, allowedServiceTypes: [...plan.allowedServiceTypes] };
}
