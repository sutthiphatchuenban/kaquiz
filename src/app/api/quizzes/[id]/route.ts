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
// By default a quiz with game history cannot be deleted (409) — pass
// ?force=true to wipe its sessions/players/answers as well. Forks made
// from this quiz survive (forkedFromId is SetNull).
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getUserFromToken();
        const { id } = await params;
        const force = request.nextUrl.searchParams.get("force") === "true";

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "กรุณาเข้าสู่ระบบ" },
                { status: 401 }
            );
        }

        const existingQuiz = await prisma.quiz.findUnique({
            where: { id },
            select: {
                userId: true,
                _count: { select: { gameSessions: true } },
            },
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

        const sessionCount = existingQuiz._count.gameSessions;

        if (sessionCount > 0 && !force) {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: `Quiz นี้มีประวัติการเล่น ${sessionCount} เกม ลบไม่ได้ — ให้ยกเลิกเผยแพร่แทน หรือลบพร้อมประวัติ`,
                    message: "HAS_HISTORY",
                },
                { status: 409 }
            );
        }

        if (sessionCount > 0 && force) {
            await prisma.$transaction(async (tx) => {
                const sessions = await tx.gameSession.findMany({
                    where: { quizId: id },
                    select: { id: true },
                });
                const sessionIds = sessions.map((s) => s.id);

                if (sessionIds.length > 0) {
                    const players = await tx.player.findMany({
                        where: { sessionId: { in: sessionIds } },
                        select: { id: true },
                    });
                    const playerIds = players.map((p) => p.id);

                    const questions = await tx.question.findMany({
                        where: { quizId: id },
                        select: { id: true },
                    });
                    const questionIds = questions.map((q) => q.id);

                    if (playerIds.length > 0 || questionIds.length > 0) {
                        await tx.playerAnswer.deleteMany({
                            where: {
                                OR: [
                                    ...(playerIds.length > 0
                                        ? [{ playerId: { in: playerIds } }]
                                        : []),
                                    ...(questionIds.length > 0
                                        ? [{ questionId: { in: questionIds } }]
                                        : []),
                                ],
                            },
                        });
                    }

                    if (playerIds.length > 0) {
                        await tx.player.deleteMany({
                            where: { id: { in: playerIds } },
                        });
                    }

                    await tx.gameSession.deleteMany({
                        where: { id: { in: sessionIds } },
                    });
                }

                await tx.quiz.delete({ where: { id } });
            });

            return NextResponse.json<ApiResponse>({
                success: true,
                message: `ลบ Quiz พร้อมประวัติ ${sessionCount} เกมสำเร็จ`,
            });
        }

        await prisma.quiz.delete({ where: { id } });

        return NextResponse.json<ApiResponse>({
            success: true,
            message: "ลบ Quiz สำเร็จ",
        });
    } catch (error) {
        console.error("Delete quiz error:", error);
        // P2003 = FK ยังค้าง (เช่น ประวัติที่สร้างขึ้นพร้อมกัน) — บอกให้ชัดแทน 500 เปล่าๆ
        if (
            error instanceof Error &&
            (error as { code?: string }).code === "P2003"
        ) {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: "ลบไม่ได้เพราะยังมีประวัติการเล่นค้างอยู่ — ลองใหม่อีกครั้งแบบลบพร้อมประวัติ",
                    message: "HAS_HISTORY",
                },
                { status: 409 }
            );
        }
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
