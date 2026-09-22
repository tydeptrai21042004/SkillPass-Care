import { InMemoryCareStore } from "@skillpass-care/care-store";
import { InMemorySkillPassOwnership } from "./ownership-memory.js";
import { SplitServiceRightLedger } from "./split-ledger.js";

/** Backward-compatible demo facade built from two independent stores. */
export class InMemoryLedger extends SplitServiceRightLedger {
  constructor() { super(new InMemorySkillPassOwnership(), new InMemoryCareStore()); }
}
