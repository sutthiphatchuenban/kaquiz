import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";

type GameStatus = "LOBBY" | "PLAYING" | "QUESTION" | "SHOWING_ANSWER" | "LEADERBOARD" | "FINISHED";

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
    params: Promise<{ pin: string }>;
}

// GET /api/games/[pin] - Get game session by PIN
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { pin } = await params;

        const gameSession = await prisma.gameSession.findUnique({
            where: { pin },
            include: {
                quiz: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        questions: {
                            select: {
                                id: true,
                                questionText: true,
                                type: true,
                                timeLimit: true,
                                points: true,
                                imageUrl: true,
                                order: true,
                                answers: {
                                    select: {
                                        id: true,
                                        answerText: true,
                                        color: true,
                                        order: true,
                                        // Don't expose isCorrect to players!
                                    },
                                    orderBy: { order: "asc" },
                                },
                            },
                            orderBy: { order: "asc" },
                        },
                    },
                },
                players: {
                    select: {
                        id: true,
                        nickname: true,
                        score: true,
                        rank: true,
                    },
                    orderBy: { score: "desc" },
                },
            },
        });

        if (!gameSession) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่พบเกมนี้" },
                { status: 404 }
            );
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: gameSession,
        });
    } catch (error) {
        console.error("Get game error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}

// PUT /api/games/[pin] - Update game status (for host)
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getUserFromToken();
        const { pin } = await params;

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "กรุณาเข้าสู่ระบบ" },
                { status: 401 }
            );
        }

        const gameSession = await prisma.gameSession.findUnique({
            where: { pin },
            select: { hostId: true },
        });

        if (!gameSession) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่พบเกมนี้" },
                { status: 404 }
            );
        }

        if (gameSession.hostId !== userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "คุณไม่ใช่ Host ของเกมนี้" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { status, currentQuestionIndex } = body;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {};

        if (status) {
            updateData.status = status;
            if (status === "PLAYING" || status === "QUESTION") {
                updateData.startedAt = new Date();
            }
            if (status === "FINISHED") {
                updateData.endedAt = new Date();
            }
        }

        if (typeof currentQuestionIndex === "number") {
            updateData.currentQuestionIndex = currentQuestionIndex;
        }

        const updated = await prisma.gameSession.update({
            where: { pin },
            data: updateData,
            include: {
                quiz: {
                    include: {
                        questions: {
                            include: { answers: { orderBy: { order: "asc" } } },
                            orderBy: { order: "asc" },
                        },
                    },
                },
                players: {
                    orderBy: { score: "desc" },
                },
            },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: updated,
        });
    } catch (error) {
        console.error("Update game error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
