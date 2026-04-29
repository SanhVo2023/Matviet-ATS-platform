import { describe, expect, it } from "vitest";
import { parseCsv } from "./parser";

describe("parseCsv (TopCV)", () => {
  it("maps the canonical TopCV header set", () => {
    const csv = [
      "Họ và tên,Email,Số điện thoại,Link CV",
      "Nguyễn Văn An,an@example.com,0901234567,https://topcv.vn/cv/abc.pdf",
      "Trần Thị Bình,binh@example.com,+84 902 345 678,https://topcv.vn/cv/def.pdf",
    ].join("\n");
    const result = parseCsv(csv, "topcv");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      full_name: "Nguyễn Văn An",
      email: "an@example.com",
      phone: "0901234567",
      cv_url: "https://topcv.vn/cv/abc.pdf",
    });
    expect(result.invalidRows).toHaveLength(0);
  });

  it("handles accent-stripped header variants", () => {
    // Headers without diacritics — fuzzy match should still pick them up
    const csv = [
      "ho va ten,email,so dien thoai,link cv",
      "Nguyễn Văn An,an@example.com,0901234567,",
    ].join("\n");
    const result = parseCsv(csv, "topcv");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.full_name).toBe("Nguyễn Văn An");
    expect(result.rows[0]?.cv_url).toBeNull();
  });

  it("flags rows missing the required full_name", () => {
    const csv = ["Họ và tên,Email,Số điện thoại,Link CV", ",missing@example.com,0901234567,"].join(
      "\n",
    );
    const result = parseCsv(csv, "topcv");
    expect(result.rows).toHaveLength(0);
    expect(result.invalidRows).toHaveLength(1);
  });

  it("rejects malformed email", () => {
    const csv = [
      "Họ và tên,Email,Số điện thoại,Link CV",
      "Nguyễn Văn An,not-an-email,0901234567,",
    ].join("\n");
    const result = parseCsv(csv, "topcv");
    expect(result.rows).toHaveLength(0);
    expect(result.invalidRows).toHaveLength(1);
  });

  it("treats empty cv_url as null", () => {
    const csv = [
      "Họ và tên,Email,Số điện thoại,Link CV",
      "Nguyễn Văn An,an@example.com,0901234567,",
    ].join("\n");
    const result = parseCsv(csv, "topcv");
    expect(result.rows[0]?.cv_url).toBeNull();
  });
});

describe("parseCsv (CareerViet)", () => {
  it("maps the CareerViet header set", () => {
    const csv = [
      "Tên ứng viên,Địa chỉ email,Điện thoại,URL CV",
      "Vũ Quang Phong,phong@example.com,0911 222 333,https://careerviet.vn/cv/x.pdf",
    ].join("\n");
    const result = parseCsv(csv, "careerviet");
    expect(result.rows[0]?.full_name).toBe("Vũ Quang Phong");
    expect(result.rows[0]?.phone).toBe("0911 222 333");
  });
});

describe("parseCsv (extras)", () => {
  it("ignores columns it doesn't know how to map", () => {
    const csv = [
      "Họ và tên,Email,Số điện thoại,Link CV,Vị trí ứng tuyển,Ghi chú",
      "Nguyễn An,an@example.com,0901234567,https://x.com/a.pdf,Sales,VIP",
    ].join("\n");
    const result = parseCsv(csv, "topcv");
    expect(result.rows).toHaveLength(1);
    // unmapped columns should not appear in the typed row
    expect(result.rows[0]).not.toHaveProperty("Vị trí ứng tuyển");
  });
});
