import { NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { requireRole } from "@/lib/auth";
import { buildReportPayload } from "@/server/reports/queries";
import { parseReportFilter } from "@/server/reports/filter";
import { formatDate } from "@/lib/vi-format";
import type { ReportPayload } from "@/server/reports/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  await requireRole(["admin", "hr"]);

  const url = new URL(req.url);
  const filter = parseReportFilter(url.searchParams);
  const payload = await buildReportPayload(filter);

  const buffer = await renderToBuffer(<ReportDoc payload={payload} />);
  const filename = `bao-cao-tuyen-dung-${filter.from.slice(0, 10)}-${filter.to.slice(0, 10)}.pdf`;
  return new NextResponse(buffer as unknown as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    color: "#1F2937",
  },
  cover: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: "#FFC107",
  },
  brandStrip: {
    backgroundColor: "#13245C",
    color: "#FFFFFF",
    padding: 6,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
  },
  h1: {
    fontSize: 20,
    fontWeight: 700,
    color: "#13245C",
    marginTop: 12,
  },
  h2: {
    fontSize: 13,
    fontWeight: 700,
    color: "#13245C",
    marginTop: 16,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  meta: {
    color: "#6B7280",
    marginTop: 4,
    fontSize: 10,
  },
  metric: {
    marginTop: 6,
    fontSize: 11,
  },
  table: { width: "100%", borderColor: "#E5E7EB" },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 4,
  },
  rowHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  cellLabel: { flex: 2, paddingHorizontal: 4 },
  cellNum: { flex: 1, textAlign: "right", paddingHorizontal: 4 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "center",
  },
});

const ROLE_VI: Record<string, string> = {
  sales: "Bán hàng",
  optician: "Khúc xạ",
  office: "Văn phòng",
  manager: "Quản lý",
  custom: "Khác",
};
const SOURCE_VI: Record<string, string> = {
  manual_upload: "Tải thủ công",
  email_inbox: "Email",
  csv_import: "Nhập CSV",
  topcv_api: "TopCV API",
  referral: "Giới thiệu",
};

function ReportDoc({ payload }: { payload: ReportPayload }) {
  return (
    <Document title="Báo cáo tuyển dụng - Mắt Việt" author="Mắt Việt HR" creator="Mắt Việt HR">
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.brandStrip}>MẮT VIỆT — BÁO CÁO TUYỂN DỤNG</Text>
          <Text style={styles.h1}>Báo cáo tổng hợp</Text>
          <Text style={styles.meta}>
            Khoảng: {formatDate(payload.filter.from)} – {formatDate(payload.filter.to)}
          </Text>
          <Text style={styles.meta}>Tổng số ứng viên trong khoảng: {payload.total_candidates}</Text>
          {payload.filter.job_id && (
            <Text style={styles.meta}>Vị trí: {payload.filter.job_id}</Text>
          )}
          {payload.filter.role_family && (
            <Text style={styles.meta}>Nhóm vị trí: {ROLE_VI[payload.filter.role_family]}</Text>
          )}
        </View>

        <Text style={styles.h2}>1. Phễu tuyển dụng</Text>
        <View style={styles.table}>
          <View style={styles.rowHeader}>
            <Text style={styles.cellLabel}>Giai đoạn</Text>
            <Text style={styles.cellNum}>Số ứng viên</Text>
          </View>
          {payload.funnel.map((f) => (
            <View key={f.super_stage} style={styles.row}>
              <Text style={styles.cellLabel}>{f.super_stage}</Text>
              <Text style={styles.cellNum}>{f.count}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>2. Thời gian tuyển</Text>
        {payload.time_to_hire.length === 0 ? (
          <Text style={styles.meta}>Chưa có ai được tuyển trong khoảng này.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.rowHeader}>
              <Text style={styles.cellLabel}>Nhóm vị trí</Text>
              <Text style={styles.cellNum}>Số tuyển</Text>
              <Text style={styles.cellNum}>Trung vị</Text>
              <Text style={styles.cellNum}>P90</Text>
            </View>
            {payload.time_to_hire.map((r, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.cellLabel}>{ROLE_VI[r.role_family ?? "custom"]}</Text>
                <Text style={styles.cellNum}>{r.hire_count}</Text>
                <Text style={styles.cellNum}>{r.median_days.toFixed(1)}d</Text>
                <Text style={styles.cellNum}>{r.p90_days.toFixed(1)}d</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.h2}>3. Hiệu quả nguồn CV</Text>
        {payload.source_effectiveness.length === 0 ? (
          <Text style={styles.meta}>Chưa có dữ liệu.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.rowHeader}>
              <Text style={styles.cellLabel}>Nguồn</Text>
              <Text style={styles.cellNum}>CV</Text>
              <Text style={styles.cellNum}>Tuyển</Text>
              <Text style={styles.cellNum}>Tỷ lệ</Text>
            </View>
            {payload.source_effectiveness.map((r, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.cellLabel}>{SOURCE_VI[r.source] ?? r.source}</Text>
                <Text style={styles.cellNum}>{r.candidates_in}</Text>
                <Text style={styles.cellNum}>{r.hires_out}</Text>
                <Text style={styles.cellNum}>{(r.hire_rate * 100).toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.h2}>4. Phân phối điểm AI</Text>
        <View style={styles.table}>
          <View style={styles.rowHeader}>
            <Text style={styles.cellLabel}>Khoảng điểm</Text>
            <Text style={styles.cellNum}>Số ứng viên</Text>
          </View>
          {payload.score_distribution.map((b) => (
            <View key={b.bucket_lower} style={styles.row}>
              <Text style={styles.cellLabel}>
                {b.bucket_lower} - {b.bucket_lower + 9}
              </Text>
              <Text style={styles.cellNum}>{b.count}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>5. Tỷ lệ chuyển vòng</Text>
        <View style={styles.table}>
          <View style={styles.rowHeader}>
            <Text style={styles.cellLabel}>Cặp chuyển</Text>
            <Text style={styles.cellNum}>Vào</Text>
            <Text style={styles.cellNum}>Qua</Text>
            <Text style={styles.cellNum}>Tỷ lệ</Text>
          </View>
          {payload.stage_conversion.map((c, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cellLabel}>
                {c.from_stage} → {c.to_stage}
              </Text>
              <Text style={styles.cellNum}>{c.upstream_count}</Text>
              <Text style={styles.cellNum}>{c.crossed_count}</Text>
              <Text style={styles.cellNum}>{c.conversion_pct}%</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>6. Tuyển theo tháng</Text>
        {payload.hires_per_month.length === 0 ? (
          <Text style={styles.meta}>Chưa có ai được tuyển trong khoảng này.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.rowHeader}>
              <Text style={styles.cellLabel}>Tháng</Text>
              <Text style={styles.cellNum}>Đã tuyển</Text>
            </View>
            {payload.hires_per_month.map((h) => (
              <View key={h.month_bucket} style={styles.row}>
                <Text style={styles.cellLabel}>{h.month_bucket}</Text>
                <Text style={styles.cellNum}>{h.hire_count}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer} fixed>
          Mắt Việt HR · Báo cáo tự động · Xuất lúc {new Date().toLocaleString("vi-VN")}
        </Text>
      </Page>
    </Document>
  );
}
