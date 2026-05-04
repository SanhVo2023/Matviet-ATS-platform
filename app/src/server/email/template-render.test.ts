import { describe, expect, it } from "vitest";
import { escapeHtml, findMissingPlaceholders, renderTemplate } from "./template-render";

describe("renderTemplate", () => {
  it("substitutes a single variable", () => {
    expect(renderTemplate("Hello {{name}}", { name: "Hương" })).toBe("Hello Hương");
  });

  it("substitutes multiple variables in a body", () => {
    const tpl = "<p>Kính gửi {{candidate_name}}</p><p>Vị trí: {{job_title}}</p>";
    const out = renderTemplate(tpl, {
      candidate_name: "Nguyễn Văn A",
      job_title: "Sales",
    });
    expect(out).toBe("<p>Kính gửi Nguyễn Văn A</p><p>Vị trí: Sales</p>");
  });

  it("tolerates whitespace inside placeholders", () => {
    expect(renderTemplate("Hi {{ name  }}!", { name: "An" })).toBe("Hi An!");
  });

  it("HTML-escapes user-provided values", () => {
    const out = renderTemplate("<p>{{x}}</p>", { x: "<script>alert(1)</script>" });
    expect(out).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  });

  it("leaves unknown variables intact", () => {
    expect(renderTemplate("{{a}} + {{b}}", { a: "1" })).toBe("1 + {{b}}");
  });

  it("treats null/undefined as missing — keeps placeholder", () => {
    expect(renderTemplate("{{a}}", { a: null })).toBe("{{a}}");
    expect(renderTemplate("{{a}}", { a: undefined })).toBe("{{a}}");
  });

  it("coerces numbers to strings", () => {
    expect(renderTemplate("{{n}} điểm", { n: 87 })).toBe("87 điểm");
  });
});

describe("findMissingPlaceholders", () => {
  it("returns the unique unfilled keys", () => {
    expect(findMissingPlaceholders("Hi {{a}} and {{b}} and {{a}}")).toEqual(["a", "b"]);
  });

  it("returns [] when all placeholders are filled", () => {
    expect(findMissingPlaceholders("Hi An")).toEqual([]);
  });
});

describe("escapeHtml", () => {
  it("escapes the canonical 5 HTML metachars", () => {
    expect(escapeHtml(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &#39;");
  });
});
