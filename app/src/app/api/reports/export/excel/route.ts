import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireRole } from "@/lib/auth";
import { buildReportPayload } from "@/server/reports/queries";
import { parseReportFilter } from "@/server/reports/filter";
import { formatDate } from "@/lib/vi-format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  await requireRole(["admin", "hr"]);

  const url = new URL(req.url);
  const filter = parseReportFilter(url.searchParams);
  const payload = await buildReportPayload(filter);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Mắt Việt HR";
  wb.created = new Date();

  const NAVY = "FF13245C";
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NAVY },
    },
    alignment: { horizontal: "center" as const, vertical: "middle" as const },
  };

  // ─────────────── Tổng quan sheet ───────────────
  const overview = wb.addWorksheet("Tổng quan");
  overview.columns = [
    { header: "Trường", key: "k", width: 28 },
    { header: "Giá trị", key: "v", width: 32 },
  ];
  overview.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
  overview.addRows([
    { k: "Khoảng thời gian", v: `${formatDate(filter.from)} – ${formatDate(filter.to)}` },
    { k: "Tổng số ứng viên (vào)", v: payload.total_candidates },
    { k: "Vị trí cụ thể", v: filter.job_id ?? "Tất cả" },
    { k: "Nhóm vị trí", v: filter.role_family ?? "Tất cả" },
    { k: "Nguồn", v: filter.source ?? "Tất cả" },
    { k: "Xuất lúc", v: new Date().toLocaleString("vi-VN") },
  ]);

  // ─────────────── Funnel ───────────────
  const funnel = wb.addWorksheet("Phễu tuyển dụng");
  funnel.columns = [
    { header: "Giai đoạn", key: "stage", width: 24 },
    { header: "Số ứng viên", key: "count", width: 16 },
  ];
  funnel.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
  for (const f of payload.funnel) {
    funnel.addRow({ stage: f.super_stage, count: f.count });
    for (const s of f.stage_breakdown) {
      funnel.addRow({ stage: `   ${s.stage}`, count: s.count });
    }
  }

  // ─────────────── Time to hire ───────────────
  const tth = wb.addWorksheet("Thời gian tuyển");
  tth.columns = [
    { header: "Nhóm vị trí", key: "role", width: 18 },
    { header: "Số người tuyển", key: "count", width: 16 },
    { header: "Trung vị (ngày)", key: "median", width: 18 },
    { header: "P90 (ngày)", key: "p90", width: 16 },
  ];
  tth.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
  for (const r of payload.time_to_hire) {
    tth.addRow({
      role: r.role_family ?? "—",
      count: r.hire_count,
      median: r.median_days,
      p90: r.p90_days,
    });
  }

  // ─────────────── Source effectiveness ───────────────
  const src = wb.addWorksheet("Nguồn CV");
  src.columns = [
    { header: "Nguồn", key: "source", width: 18 },
    { header: "CV", key: "in", width: 10 },
    { header: "Tuyển", key: "out", width: 10 },
    { header: "Tỷ lệ tuyển", key: "rate", width: 14 },
    { header: "TG TB (ngày)", key: "tth", width: 16 },
    { header: "Điểm AI TB", key: "score", width: 14 },
  ];
  src.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
  for (const r of payload.source_effectiveness) {
    src.addRow({
      source: r.source,
      in: r.candidates_in,
      out: r.hires_out,
      rate: `${(r.hire_rate * 100).toFixed(1)}%`,
      tth: r.avg_days_to_hire?.toFixed(1) ?? "—",
      score: r.avg_ai_score?.toFixed(1) ?? "—",
    });
  }

  // ─────────────── Score distribution ───────────────
  const sd = wb.addWorksheet("Phân phối điểm AI");
  sd.columns = [
    { header: "Khoảng điểm", key: "bucket", width: 16 },
    { header: "Số ứng viên", key: "count", width: 16 },
  ];
  sd.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
  for (const b of payload.score_distribution) {
    sd.addRow({ bucket: `${b.bucket_lower}-${b.bucket_lower + 9}`, count: b.count });
  }

  // ─────────────── Stage conversion ───────────────
  const sc = wb.addWorksheet("Tỷ lệ chuyển vòng");
  sc.columns = [
    { header: "Từ giai đoạn", key: "from", width: 22 },
    { header: "Sang", key: "to", width: 22 },
    { header: "Vào", key: "upstream", width: 12 },
    { header: "Qua", key: "crossed", width: 12 },
    { header: "Tỷ lệ %", key: "pct", width: 12 },
  ];
  sc.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
  for (const c of payload.stage_conversion) {
    sc.addRow({
      from: c.from_stage,
      to: c.to_stage,
      upstream: c.upstream_count,
      crossed: c.crossed_count,
      pct: c.conversion_pct,
    });
  }

  // ─────────────── Hires per month ───────────────
  const hpm = wb.addWorksheet("Tuyển theo tháng");
  hpm.columns = [
    { header: "Tháng", key: "month", width: 16 },
    { header: "Số người tuyển", key: "count", width: 16 },
  ];
  hpm.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
  for (const h of payload.hires_per_month) {
    hpm.addRow({ month: h.month_bucket, count: h.hire_count });
  }

  // Format & return
  const buf = await wb.xlsx.writeBuffer();
  const filename = `bao-cao-tuyen-dung-${filter.from.slice(0, 10)}-${filter.to.slice(0, 10)}.xlsx`;
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
