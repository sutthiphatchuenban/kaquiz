import { NextRequest, NextResponse } from "next/server";
import { getReport, getReportUserId } from "@/lib/server/reports";
import { buildReportCsv } from "@/lib/report-csv";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userId = await getReportUserId();
        if (!userId) {
            return NextResponse.json({ success: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
        }
        const mode = request.nextUrl.searchParams.get("type") || "summary";
        if (mode !== "summary" && mode !== "answers") {
            return NextResponse.json({ success: false, error: "รูปแบบรายงานไม่ถูกต้อง" }, { status: 400 });
        }
        const { id } = await params;
        const report = await getReport(id, userId);
        if (!report) {
            return NextResponse.json({ success: false, error: "ไม่พบรายงานนี้" }, { status: 404 });
        }
        return new NextResponse(buildReportCsv(report, mode), {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="kaquiz-${report.pin}-${mode}.csv"`,
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("Export report error:", error);
        return NextResponse.json({ success: false, error: "ไม่สามารถส่งออกรายงานได้ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
    }
}
