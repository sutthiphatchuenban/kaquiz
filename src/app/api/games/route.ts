import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import { generateGamePin } from "@/lib/auth";
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

// POST /api/games - Create a new game session
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
        const { quizId } = body;

        if (!quizId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "กรุณาระบุ Quiz" },
                { status: 400 }
            );
        }

        // Verify quiz exists and belongs to user
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
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
                { success: false, error: "ไม่มีสิทธิ์เริ่มเกมนี้" },
                { status: 403 }
            );
        }

        if (quiz.questions.length === 0) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "Quiz ต้องมีคำถามอย่างน้อย 1 ข้อ" },
                { status: 400 }
            );
        }

        // Generate unique PIN
        let pin = generateGamePin();
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const existing = await prisma.gameSession.findUnique({
                where: { pin },
            });
            if (!existing) break;
            pin = generateGamePin();
            attempts++;
        }

        if (attempts >= maxAttempts) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่สามารถสร้าง Game PIN ได้" },
                { status: 500 }
            );
        }

        // Create game session
        const gameSession = await prisma.gameSession.create({
            data: {
                pin,
                quizId,
                hostId: userId,
                status: "LOBBY",
            },
            include: {
                quiz: {
                    include: {
                        questions: {
                            include: { answers: { orderBy: { order: "asc" } } },
                            orderBy: { order: "asc" },
                        },
                    },
                },
                players: true,
            },
        });

        return NextResponse.json<ApiResponse>(
            { success: true, data: gameSession, message: "สร้าง Game Session สำเร็จ" },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create game error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
