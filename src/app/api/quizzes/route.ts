import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import { createQuizSchema } from "@/lib/validations/quiz";
import type { ApiResponse } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "kaquiz-super-secret-key-change-in-production"
);

// Helper to get user from token
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

// GET /api/quizzes - Get all quizzes for current user
export async function GET() {
    try {
        const userId = await getUserFromToken();

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "กรุณาเข้าสู่ระบบ" },
                { status: 401 }
            );
        }

        const quizzes = await prisma.quiz.findMany({
            where: { userId },
            include: {
                _count: {
                    select: { questions: true, gameSessions: true },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: quizzes,
        });
    } catch (error) {
        console.error("Get quizzes error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}

// POST /api/quizzes - Create a new quiz
export async function POST(request: NextRequest) {
    try {
        const userId = await getUserFromToken();

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "กรุณาเข้าสู่ระบบ" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const result = createQuizSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const quiz = await prisma.quiz.create({
            data: {
                ...result.data,
                userId,
            },
        });

        return NextResponse.json<ApiResponse>(
            { success: true, data: quiz, message: "สร้าง Quiz สำเร็จ" },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create quiz error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
