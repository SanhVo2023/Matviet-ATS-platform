import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "./safe-next";

describe("sanitizeNextPath", () => {
  it("passes through ordinary relative paths", () => {
    expect(sanitizeNextPath("/ung-vien")).toBe("/ung-vien");
    expect(sanitizeNextPath("/ung-vien?stage=offer&q=a b")).toBe("/ung-vien?stage=offer&q=a b");
    expect(sanitizeNextPath("/vi-tri/123/qr")).toBe("/vi-tri/123/qr");
  });

  it("defaults to / for empty or missing values", () => {
    expect(sanitizeNextPath(null)).toBe("/");
    expect(sanitizeNextPath(undefined)).toBe("/");
    expect(sanitizeNextPath("")).toBe("/");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(sanitizeNextPath("https://evil.example")).toBe("/");
    expect(sanitizeNextPath("http://evil.example/x")).toBe("/");
    expect(sanitizeNextPath("//evil.example")).toBe("/");
    expect(sanitizeNextPath("/\\evil.example")).toBe("/");
    expect(sanitizeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("rejects redirect loops back into the login page", () => {
    expect(sanitizeNextPath("/dang-nhap")).toBe("/");
    expect(sanitizeNextPath("/dang-nhap?next=/x")).toBe("/");
    expect(sanitizeNextPath("/dang-nhap/anything")).toBe("/");
    // ...but not unrelated prefixes
    expect(sanitizeNextPath("/dang-nhap-khac")).toBe("/dang-nhap-khac");
  });
});
