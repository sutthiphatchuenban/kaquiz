import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SubmitAnswerError, submitGameAnswer } from "@/lib/server/submit-game-answer";
import type { ApiResponse } from "@/types";

interface RouteParams {
    params: Promise<{ pin: string }>;
}

// POST /api/games/[pin]/answer - Submit an answer
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { pin } = await params;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ข้อมูล JSON ไม่ถูกต้อง กรุณาส่งคำตอบอีกครั้ง" },
                { status: 400 }
            );
        }
        const data = await submitGameAnswer(prisma, pin, body);
        return NextResponse.json<ApiResponse>({ success: true, data });
    } catch (error) {
        if (error instanceof SubmitAnswerError) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: error.message },
                { status: error.status }
            );
        }
        console.error("Submit answer error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "บันทึกคำตอบไม่สำเร็จ กรุณาลองส่งคำตอบเดิมอีกครั้ง" },
            { status: 500 }
        );
    }
}
