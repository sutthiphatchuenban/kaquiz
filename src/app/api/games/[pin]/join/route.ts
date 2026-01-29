import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { joinGameSchema } from "@/lib/validations/game";
import type { ApiResponse } from "@/types";

interface RouteParams {
    params: Promise<{ pin: string }>;
}

// POST /api/games/[pin]/join - Join a game as a player
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { pin } = await params;
        const body = await request.json();

        // Validate input
        const result = joinGameSchema.safeParse({ pin, nickname: body.nickname });
        if (!result.success) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const { nickname } = result.data;

        // Find game session
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

        if (gameSession.status !== "LOBBY") {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "เกมนี้เริ่มแล้วหรือจบแล้ว" },
                { status: 400 }
            );
        }

        // Check if nickname is already taken in this session
        const existingPlayer = await prisma.player.findFirst({
            where: {
                sessionId: gameSession.id,
                nickname: nickname,
            },
        });

        if (existingPlayer) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ชื่อนี้ถูกใช้แล้วในเกมนี้" },
                { status: 400 }
            );
        }

        // Create player
        const player = await prisma.player.create({
            data: {
                nickname,
                sessionId: gameSession.id,
            },
        });

        return NextResponse.json<ApiResponse>(
            { success: true, data: player, message: "เข้าร่วมเกมสำเร็จ" },
            { status: 201 }
        );
    } catch (error) {
        console.error("Join game error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
