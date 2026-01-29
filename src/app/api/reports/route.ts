import { NextResponse } from "next/server";
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

// GET /api/reports - Get all game sessions for current user
export async function GET() {
    try {
        const userId = await getUserFromToken();

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "กรุณาเข้าสู่ระบบ" },
                { status: 401 }
            );
        }

        const sessions = await prisma.gameSession.findMany({
            where: { hostId: userId },
            include: {
                quiz: {
                    select: { title: true },
                },
                _count: {
                    select: { players: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: sessions,
        });
    } catch (error) {
        console.error("Get reports error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
