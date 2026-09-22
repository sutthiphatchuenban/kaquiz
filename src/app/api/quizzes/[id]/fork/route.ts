import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";
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

// POST /api/quizzes/[id]/fork - คัดลอก quiz สาธารณะมาเป็นของตัวเอง
export async function POST(_request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getUserFromToken();
        const { id } = await params;

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "กรุณาเข้าสู่ระบบ" },
                { status: 401 }
            );
        }

        const src = await prisma.quiz.findUnique({
            where: { id },
            include: {
                questions: { include: { answers: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
            },
        });

        if (!src) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่พบ Quiz" },
                { status: 404 }
            );
        }

        if (!src.isPublished && src.userId !== userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "Quiz นี้ยังไม่เผยแพร่" },
                { status: 403 }
            );
        }

        if (src.userId === userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "นี่คือ Quiz ของคุณอยู่แล้ว" },
                { status: 400 }
            );
        }

        if (src.questions.length === 0) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "Quiz ต้นฉบับไม่มีคำถาม" },
                { status: 400 }
            );
        }

        const copy = await prisma.$transaction(async (tx) => {
            const created = await tx.quiz.create({
                data: {
                    title: `${src.title} (สำเนา)`.slice(0, 100),
                    description: src.description,
                    coverImage: src.coverImage,
                    category: src.category,
                    difficulty: src.difficulty,
                    isPublished: false,
                    userId,
                    forkedFromId: src.id,
                },
            });

            for (const q of src.questions) {
                const nq = await tx.question.create({
                    data: {
                        quizId: created.id,
                        questionText: q.questionText,
                        type: q.type,
                        timeLimit: q.timeLimit,
                        points: q.points,
                        imageUrl: q.imageUrl,
                        order: q.order,
                    },
                });
                if (q.answers.length > 0) {
                    await tx.answer.createMany({
                        data: q.answers.map((a) => ({
                            questionId: nq.id,
                            answerText: a.answerText,
                            isCorrect: a.isCorrect,
                            color: a.color,
                            order: a.order,
                        })),
                    });
                }
            }

            await tx.quiz.update({
                where: { id: src.id },
                data: { copyCount: { increment: 1 } },
            });

            return created;
        });

        return NextResponse.json<ApiResponse>(
            { success: true, data: copy, message: "คัดลอก Quiz สำเร็จ" },
            { status: 201 }
        );
    } catch (error) {
        console.error("Fork quiz error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
