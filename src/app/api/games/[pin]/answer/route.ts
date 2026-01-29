import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculatePoints } from "@/lib/auth";
import type { ApiResponse } from "@/types";

interface RouteParams {
    params: Promise<{ pin: string }>;
}

// POST /api/games/[pin]/answer - Submit an answer
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { pin } = await params;
        const body = await request.json();
        const { playerId, questionId, answerId, responseTime } = body;

        if (!playerId || !questionId || responseTime === undefined) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ข้อมูลไม่ครบถ้วน" },
                { status: 400 }
            );
        }

        // Get game session
        const gameSession = await prisma.gameSession.findUnique({
            where: { pin },
            select: { id: true, status: true },
        });

        if (!gameSession) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่พบเกมนี้" },
                { status: 404 }
            );
        }

        if (gameSession.status !== "QUESTION") {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่อยู่ในช่วงตอบคำถาม" },
                { status: 400 }
            );
        }

        // Check if player exists
        const player = await prisma.player.findUnique({
            where: { id: playerId },
            select: { id: true, sessionId: true },
        });

        if (!player || player.sessionId !== gameSession.id) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่พบผู้เล่น" },
                { status: 404 }
            );
        }

        // Check if already answered
        const existingAnswer = await prisma.playerAnswer.findFirst({
            where: {
                playerId,
                questionId,
            },
        });

        if (existingAnswer) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "คุณตอบคำถามนี้แล้ว" },
                { status: 400 }
            );
        }

        // Get question and answer
        const question = await prisma.question.findUnique({
            where: { id: questionId },
            select: { timeLimit: true, points: true },
        });

        if (!question) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่พบคำถาม" },
                { status: 404 }
            );
        }

        let isCorrect = false;
        if (answerId) {
            const answer = await prisma.answer.findUnique({
                where: { id: answerId },
                select: { isCorrect: true },
            });
            isCorrect = answer?.isCorrect || false;
        }

        // Calculate points
        const pointsEarned = calculatePoints(
            isCorrect,
            responseTime,
            question.timeLimit * 1000,
            question.points
        );

        // Save answer
        const playerAnswer = await prisma.playerAnswer.create({
            data: {
                playerId,
                questionId,
                answerId,
                isCorrect,
                responseTime,
                pointsEarned,
            },
        });

        // Update player score
        await prisma.player.update({
            where: { id: playerId },
            data: {
                score: {
                    increment: pointsEarned,
                },
            },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: {
                isCorrect,
                pointsEarned,
                answerId: playerAnswer.id,
            },
        });
    } catch (error) {
        console.error("Submit answer error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
