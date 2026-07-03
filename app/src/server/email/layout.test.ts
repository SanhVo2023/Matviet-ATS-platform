import { describe, expect, it } from "vitest";
import { brandEmailHtml, emailCtaButton, htmlToText, isFullHtmlDocument } from "./layout";

describe("brandEmailHtml", () => {
  it("wraps content in the branded shell with the body intact", () => {
    const html = brandEmailHtml({
      bodyHtml: "<p>Kính gửi Nguyễn Văn A,</p>",
      title: "Lời mời phỏng vấn",
    });
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<p>Kính gửi Nguyễn Văn A,</p>");
    expect(html).toContain("data-mv-branded");
    expect(html).toContain("#13245C"); // navy header
    expect(html).toContain("#FFC107"); // gold bar
    expect(html).toContain("<title>Lời mời phỏng vấn</title>");
  });

  it("is idempotent — never double-wraps an already-branded body", () => {
    const once = brandEmailHtml({ bodyHtml: "<p>Xin chào</p>" });
    const twice = brandEmailHtml({ bodyHtml: once });
    expect(twice).toBe(once);
  });

  it("passes through full HTML documents untouched", () => {
    const doc = "<html><body><p>raw</p></body></html>";
    expect(isFullHtmlDocument(doc)).toBe(true);
    expect(brandEmailHtml({ bodyHtml: doc })).toBe(doc);
  });

  it("escapes < in the title", () => {
    const html = brandEmailHtml({ bodyHtml: "<p>x</p>", title: "<script>" });
    expect(html).toContain("<title>&lt;script></title>");
  });
});

describe("emailCtaButton", () => {
  it("renders a link with the label and href", () => {
    const btn = emailCtaButton("https://hr.matviet.com.vn/dat-lai-mat-khau?t=abc", "Đặt mật khẩu");
    expect(btn).toContain('href="https://hr.matviet.com.vn/dat-lai-mat-khau?t=abc"');
    expect(btn).toContain("Đặt mật khẩu");
  });
});

describe("htmlToText", () => {
  it("converts paragraphs, breaks, lists and links", () => {
    const text = htmlToText(
      "<p>Kính gửi bạn,</p><ul><li>Thời gian: <strong>9h</strong></li></ul>" +
        '<p><a href="https://example.com/x">Mở liên kết</a></p>',
    );
    expect(text).toContain("Kính gửi bạn,");
    expect(text).toContain("• Thời gian: 9h");
    expect(text).toContain("Mở liên kết (https://example.com/x)");
    expect(text).not.toContain("<");
  });

  it("decodes common entities and collapses blank lines", () => {
    const text = htmlToText("<p>A&nbsp;&amp;&nbsp;B</p><p></p><p></p><p>C&#39;s</p>");
    expect(text).toBe("A & B\n\nC's");
  });
});
