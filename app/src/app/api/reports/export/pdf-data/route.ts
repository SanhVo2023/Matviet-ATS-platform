import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { buildReportPayload } from "@/server/reports/queries";
import { parseReportFilter } from "@/server/reports/filter";

export const dynamic = "force-dynamic";

/**
 * Report payload as JSON for the CLIENT-side PDF renderer (ReportPdfDoc).
 * The PDF itself is generated in the browser: react-pdf's yoga layout engine
 * needs runtime WASM compilation, which Cloudflare Workers disallows.
 */
export async function GET(req: Request): Promise<Response> {
  await requireRole(["admin", "hr"]);
  const url = new URL(req.url);
  const filter = parseReportFilter(url.searchParams);
  const payload = await buildReportPayload(filter);
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
