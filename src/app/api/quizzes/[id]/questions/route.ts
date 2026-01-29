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

// PUT /api/quizzes/[id]/questions - Update a question
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getUserFromToken();
        const { id: quizId } = await params;

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "กรุณาเข้าสู่ระบบ" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { questionId, ...data } = body;

        if (!questionId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "Missing questionId" },
                { status: 400 }
            );
        }

        // Verify ownership
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            select: { userId: true },
        });

        if (!quiz || quiz.userId !== userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่มีสิทธิ์แก้ไข" },
                { status: 403 }
            );
        }

        // Validate data
        const result = questionSchema.safeParse(data);
        if (!result.success) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ข้อมูลไม่ถูกต้อง" },
                { status: 400 }
            );
        }

        const { answers, ...questionData } = result.data;

        // Transaction to update question and replace answers
        const updatedQuestion = await prisma.$transaction(async (tx) => {
            // Update question details
            const q = await tx.question.update({
                where: { id: questionId },
                data: questionData,
            });

            // Delete old answers
            await tx.answer.deleteMany({
                where: { questionId },
            });

            // Create new answers
            await tx.answer.createMany({
                data: answers.map((a) => ({
                    ...a,
                    questionId,
                })),
            });

            // Return updated question with answers
            return await tx.question.findUnique({
                where: { id: questionId },
                include: { answers: { orderBy: { order: "asc" } } },
            });
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: updatedQuestion,
            message: "แก้ไขคำถามสำเร็จ",
        });

    } catch (error) {
        console.error("Update question error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}

// DELETE /api/quizzes/[id]/questions - Delete a question
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getUserFromToken();
        const { id: quizId } = await params;
        const { searchParams } = new URL(request.url);
        const questionId = searchParams.get("questionId");

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (!questionId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "Missing questionId" },
                { status: 400 }
            );
        }

        // Verify ownership
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            select: { userId: true },
        });

        if (!quiz || quiz.userId !== userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "Forbidden" },
                { status: 403 }
            );
        }

        // Delete question (cascade deletes answers)
        await prisma.question.delete({
            where: { id: questionId },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            message: "ลบคำถามสำเร็จ",
        });

    } catch (error) {
        console.error("Delete question error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
