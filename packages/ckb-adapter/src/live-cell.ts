import { SkillPassError } from "@skillpass-care/shared";

/**
 * Enforces the protocol invariant that an entitlement identity resolves to at
 * most one canonical live Cell. A duplicate result is a fail-closed condition,
 * not a tie that application code may choose between.
 */
export function selectUniqueLiveCell<T>(cells: readonly T[]): T | undefined {
  if (cells.length === 0) return undefined;
  if (cells.length > 1) {
    throw new SkillPassError(
      "LEDGER_UNAVAILABLE",
      `canonical entitlement resolution found ${cells.length} live Cells; expected at most one`,
      503
    );
  }
  return cells[0];
}
