import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import { publishQuizSchema } from "@/lib/validations/quiz";
import type { ApiResponse } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "kaquiz-super-secret-key-change-in-production"
);

async function getUserFromToken() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload.id as string;
    } catch {
        return null;
    }
}

interface RouteParams {
    params: Promise<{ id: string }>;
}

// PATCH /api/quizzes/[id]/publish - เผยแพร่ / ยกเลิกเผยแพร่ (owner only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getUserFromToken();
        const { id } = await params;

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "กรุณาเข้าสู่ระบบ" },
                { status: 401 }
            );
        }

        const existing = await prisma.quiz.findUnique({
            where: { id },
            select: { userId: true, _count: { select: { questions: true } } },
        });

        if (!existing) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่พบ Quiz" },
                { status: 404 }
            );
        }

        if (existing.userId !== userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่มีสิทธิ์แก้ไข" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const result = publishQuizSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const { isPublished, category, difficulty } = result.data;

        if (isPublished && existing._count.questions < 1) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ต้องมีคำถามอย่างน้อย 1 ข้อก่อนเผยแพร่" },
                { status: 400 }
            );
        }

        const quiz = await prisma.quiz.update({
            where: { id },
            data: {
                isPublished,
                category: category || null,
                difficulty: difficulty ?? null,
                publishedAt: isPublished ? new Date() : null,
            },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: quiz,
            message: isPublished ? "เผยแพร่ Quiz แล้ว" : "ยกเลิกเผยแพร่แล้ว",
        });
    } catch (error) {
        console.error("Publish quiz error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
