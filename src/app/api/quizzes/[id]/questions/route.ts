import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import { questionSchema } from "@/lib/validations/quiz";
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

// GET /api/quizzes/[id]/questions - Get all questions for a quiz
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getUserFromToken();
        const { id: quizId } = await params;

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "กรุณาเข้าสู่ระบบ" },
                { status: 401 }
            );
        }

        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            select: { userId: true },
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

        const questions = await prisma.question.findMany({
            where: { quizId },
            include: { answers: { orderBy: { order: "asc" } } },
            orderBy: { order: "asc" },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: questions,
        });
    } catch (error) {
        console.error("Get questions error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}

// POST /api/quizzes/[id]/questions - Create a new question
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getUserFromToken();
        const { id: quizId } = await params;

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "กรุณาเข้าสู่ระบบ" },
                { status: 401 }
            );
        }

        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            select: { userId: true },
        });

        if (!quiz) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่พบ Quiz" },
                { status: 404 }
            );
        }

        if (quiz.userId !== userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่มีสิทธิ์เพิ่มคำถาม" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const result = questionSchema.safeParse(body);

        if (!result.success) {
            console.error("Zod Validation Error:", result.error.format());
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: result.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง"
                },
                { status: 400 }
            );
        }

        const { answers, ...questionData } = result.data;

        const question = await prisma.question.create({
            data: {
                ...questionData,
                quizId,
                answers: {
                    create: answers,
                },
            },
            include: { answers: true },
        });

        return NextResponse.json<ApiResponse>(
            { success: true, data: question, message: "เพิ่มคำถามสำเร็จ" },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create question error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
