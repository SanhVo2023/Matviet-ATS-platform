import { describe, expect, it } from "vitest";
import { normalizePhone, stripDiacritics } from "./csv-import";

describe("normalizePhone", () => {
  it("strips spaces, dashes, parens, dots", () => {
    expect(normalizePhone("0901-234-567")).toBe("0901234567");
    expect(normalizePhone("(090) 1234567")).toBe("0901234567");
    expect(normalizePhone("0901.234.567")).toBe("0901234567");
  });

  it("converts +84 to 0", () => {
    expect(normalizePhone("+84 901 234 567")).toBe("0901234567");
    expect(normalizePhone("+84901234567")).toBe("0901234567");
  });

  it("returns empty string for null / undefined / empty", () => {
    expect(normalizePhone(null)).toBe("");
    expect(normalizePhone(undefined)).toBe("");
    expect(normalizePhone("")).toBe("");
  });

  it("strips letters", () => {
    expect(normalizePhone("0901abc234")).toBe("0901234");
  });
});

describe("stripDiacritics", () => {
  it("removes Vietnamese diacritics", () => {
    expect(stripDiacritics("Nguyễn Văn An")).toBe("Nguyen Van An");
    expect(stripDiacritics("Họ và tên")).toBe("Ho va ten");
  });

  it("preserves ASCII", () => {
    expect(stripDiacritics("hello world")).toBe("hello world");
  });

  it("converts đ/Đ to d/D", () => {
    expect(stripDiacritics("Đào")).toBe("Dao");
    expect(stripDiacritics("đặc biệt")).toBe("dac biet");
  });
});
