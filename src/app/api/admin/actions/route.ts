import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminUser, isAdminEmail } from "@/lib/server/admin-auth";
import type { ApiResponse } from "@/types";

type AdminAction = "DELETE_USER" | "DELETE_QUIZ" | "END_SESSION";

function hasValidOrigin(request: NextRequest): boolean {
    const origin = request.headers.get("origin");
    if (!origin) return true;
    return origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
    const admin = await getAdminUser();
    if (!admin) {
        return NextResponse.json<ApiResponse>(
            { success: false, error: "ไม่มีสิทธิ์ดำเนินการ" },
            { status: 403 }
        );
    }

    if (!hasValidOrigin(request)) {
        return NextResponse.json<ApiResponse>(
            { success: false, error: "คำขอไม่ถูกต้อง" },
            { status: 403 }
        );
    }

    try {
        const body = (await request.json()) as { action?: AdminAction; targetId?: string };
        if (!body.action || !body.targetId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ข้อมูลไม่ครบถ้วน" },
                { status: 400 }
            );
        }

        if (body.action === "END_SESSION") {
            await prisma.gameSession.update({
                where: { id: body.targetId },
                data: { status: "FINISHED", endedAt: new Date() },
            });
        } else if (body.action === "DELETE_QUIZ") {
            const quiz = await prisma.quiz.findUnique({
                where: { id: body.targetId },
                select: { _count: { select: { gameSessions: true } } },
            });
            if (!quiz) {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: "ไม่พบ Quiz" },
                    { status: 404 }
                );
            }
            if (quiz._count.gameSessions > 0) {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: "ลบ Quiz ที่มีประวัติการเล่นไม่ได้" },
                    { status: 409 }
                );
            }
            await prisma.quiz.delete({ where: { id: body.targetId } });
        } else if (body.action === "DELETE_USER") {
            const user = await prisma.user.findUnique({
                where: { id: body.targetId },
                select: {
                    id: true,
                    email: true,
                    _count: { select: { quizzes: true, gameSessions: true } },
                },
            });
            if (!user) {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: "ไม่พบผู้ใช้" },
                    { status: 404 }
                );
            }
            if (user.id === admin.id || isAdminEmail(user.email)) {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: "ไม่สามารถลบบัญชีผู้ดูแลได้" },
                    { status: 409 }
                );
            }
            if (user._count.quizzes > 0 || user._count.gameSessions > 0) {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: "ลบผู้ใช้ที่มี Quiz หรือประวัติการเล่นไม่ได้" },
                    { status: 409 }
                );
            }
            await prisma.user.delete({ where: { id: user.id } });
        } else {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่รู้จักคำสั่งนี้" },
                { status: 400 }
            );
        }

        console.info(`[ADMIN] ${admin.email} performed ${body.action} on ${body.targetId}`);
        return NextResponse.json<ApiResponse>({ success: true, message: "ดำเนินการสำเร็จ" });
    } catch (error) {
        console.error("Admin action error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "ดำเนินการไม่สำเร็จ" },
            { status: 500 }
        );
    }
}
