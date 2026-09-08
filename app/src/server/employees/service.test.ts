import { describe, it, expect } from "vitest";
import { nextEmployeeCode } from "./service";

describe("nextEmployeeCode", () => {
  it("starts at MV0001 when there are no codes", () => {
    expect(nextEmployeeCode([])).toBe("MV0001");
    expect(nextEmployeeCode([null, undefined])).toBe("MV0001");
  });

  it("increments the max numeric suffix, zero-padded to 4", () => {
    expect(nextEmployeeCode(["MV0001", "MV0002"])).toBe("MV0003");
    expect(nextEmployeeCode(["MV0009"])).toBe("MV0010");
  });

  it("ignores non-matching / malformed codes", () => {
    expect(nextEmployeeCode(["ABC", "MV", "MVxyz", "MV0005", "temp-3"])).toBe("MV0006");
  });

  it("handles gaps by using the max, not the count", () => {
    expect(nextEmployeeCode(["MV0001", "MV0050"])).toBe("MV0051");
  });

  it("grows past 4 digits without truncating", () => {
    expect(nextEmployeeCode(["MV9999"])).toBe("MV10000");
  });
});
