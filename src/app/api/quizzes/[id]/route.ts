import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import { updateQuizSchema } from "@/lib/validations/quiz";
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

// GET /api/quizzes/[id] - Get a single quiz
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getUserFromToken();
        const { id } = await params;

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "กรุณาเข้าสู่ระบบ" },
                { status: 401 }
            );
        }

        const quiz = await prisma.quiz.findUnique({
            where: { id },
            include: {
                questions: {
                    include: { answers: { orderBy: { order: "asc" } } },
                    orderBy: { order: "asc" },
                },
            },
        });

        if (!quiz) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่พบ Quiz" },
                { status: 404 }
            );
        }

        if (quiz.userId !== userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่มีสิทธิ์เข้าถึง" },
                { status: 403 }
            );
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: quiz,
        });
    } catch (error) {
        console.error("Get quiz error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}

// PUT /api/quizzes/[id] - Update a quiz
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getUserFromToken();
        const { id } = await params;

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "กรุณาเข้าสู่ระบบ" },
                { status: 401 }
            );
        }

        const existingQuiz = await prisma.quiz.findUnique({
            where: { id },
            select: { userId: true },
        });

        if (!existingQuiz) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่พบ Quiz" },
                { status: 404 }
            );
        }

        if (existingQuiz.userId !== userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่มีสิทธิ์แก้ไข" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const result = updateQuizSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const quiz = await prisma.quiz.update({
            where: { id },
            data: result.data,
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: quiz,
            message: "แก้ไข Quiz สำเร็จ",
        });
    } catch (error) {
        console.error("Update quiz error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}

// DELETE /api/quizzes/[id] - Delete a quiz
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getUserFromToken();
        const { id } = await params;

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "กรุณาเข้าสู่ระบบ" },
                { status: 401 }
            );
        }

        const existingQuiz = await prisma.quiz.findUnique({
            where: { id },
            select: { userId: true },
        });

        if (!existingQuiz) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่พบ Quiz" },
                { status: 404 }
            );
        }

        if (existingQuiz.userId !== userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่มีสิทธิ์ลบ" },
                { status: 403 }
            );
        }

        await prisma.quiz.delete({ where: { id } });

        return NextResponse.json<ApiResponse>({
            success: true,
            message: "ลบ Quiz สำเร็จ",
        });
    } catch (error) {
        console.error("Delete quiz error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
