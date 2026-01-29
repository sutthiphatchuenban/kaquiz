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
    params: Promise<{ pin: string }>;
}

// GET /api/games/[pin]/host - Get game data with answers for host
export async function GET(request: NextRequest, { params }: RouteParams) {
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
                                        isCorrect: true, // Include isCorrect for host
                                        color: true,
                                        order: true,
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

        // Verify user is the host
        if (gameSession.hostId !== userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "คุณไม่ใช่ Host ของเกมนี้" },
                { status: 403 }
            );
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: gameSession,
        });
    } catch (error) {
        console.error("Get host game error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
