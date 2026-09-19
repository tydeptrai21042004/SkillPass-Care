import { describe, expect, it } from "vitest";
import { selectUniqueLiveCell } from "../src/index.js";

describe("selectUniqueLiveCell", () => {
  it("returns zero/one result and fails closed on duplicate live Cells", () => {
    expect(selectUniqueLiveCell([])).toBeUndefined();
    expect(selectUniqueLiveCell([{ outPoint: "0x1" }])).toEqual({ outPoint: "0x1" });
    expect(() => selectUniqueLiveCell([{ outPoint: "0x1" }, { outPoint: "0x2" }]))
      .toThrow("expected at most one");
  });
});
