import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "kaquiz-super-secret-key-change-in-production"
);

interface RouteParams {
    params: Promise<{ id: string }>;
}

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: { "Cache-Control": "private, no-store" },
    });
}

// GET /api/quizzes/public/[id]/answer-key - เฉลยสำหรับผู้เข้าสู่ระบบ
export async function GET(_request: Request, { params }: RouteParams) {
    try {
        const token = (await cookies()).get("auth-token")?.value;
        if (!token) {
            return jsonResponse({ success: false, error: "กรุณาเข้าสู่ระบบเพื่อดูเฉลย" }, 401);
        }

        try {
            await jwtVerify(token, JWT_SECRET);
        } catch {
            return jsonResponse({ success: false, error: "กรุณาเข้าสู่ระบบเพื่อดูเฉลย" }, 401);
        }

        const { id } = await params;
        const quiz = await prisma.quiz.findUnique({
            where: { id },
            select: {
                isPublished: true,
                questions: {
                    orderBy: { order: "asc" },
                    select: {
                        id: true,
                        answers: {
                            orderBy: { order: "asc" },
                            select: { id: true, isCorrect: true },
                        },
                    },
                },
            },
        });

        if (!quiz || !quiz.isPublished) {
            return jsonResponse({ success: false, error: "ไม่พบ Quiz สาธารณะ" }, 404);
        }

        return jsonResponse({
            success: true,
            data: { questions: quiz.questions },
        });
    } catch (error) {
        console.error("Public quiz answer key error:", error);
        return jsonResponse({ success: false, error: "เกิดข้อผิดพลาด" }, 500);
    }
}
