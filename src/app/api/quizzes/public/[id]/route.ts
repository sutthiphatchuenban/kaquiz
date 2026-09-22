import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/quizzes/public/[id] - รายละเอียด quiz สาธารณะ (ซ่อนเฉลย)
export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const quiz = await prisma.quiz.findUnique({
            where: { id },
            include: {
                user: { select: { name: true } },
                questions: {
                    include: { answers: { orderBy: { order: "asc" } } },
                    orderBy: { order: "asc" },
                },
                _count: { select: { questions: true, gameSessions: true } },
            },
        });

        if (!quiz || !quiz.isPublished) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่พบ Quiz สาธารณะ" },
                { status: 404 }
            );
        }

        // Strip isCorrect กันส่องเฉลย
        const safeQuestions = quiz.questions.map((q) => ({
            ...q,
            answers: q.answers.map((a) => {
                const { isCorrect: _omit, ...safe } = a;
                void _omit;
                return safe;
            }),
        }));

        return NextResponse.json<ApiResponse>({
            success: true,
            data: {
                ...quiz,
                author: quiz.user,
                questions: safeQuestions,
            },
        });
    } catch (error) {
        console.error("Public quiz detail error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
