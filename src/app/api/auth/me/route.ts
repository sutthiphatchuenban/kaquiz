import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import type { ApiResponse, AuthUser } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "kaquiz-super-secret-key-change-in-production"
);

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth-token")?.value;

        if (!token) {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: "ไม่พบ Token",
                },
                { status: 401 }
            );
        }

        // Verify token
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = payload.id as string;

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
            },
        });

        if (!user) {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: "ไม่พบผู้ใช้",
                },
                { status: 401 }
            );
        }

        return NextResponse.json<ApiResponse<AuthUser>>({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error("Get me error:", error);
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: "Token ไม่ถูกต้องหรือหมดอายุ",
            },
            { status: 401 }
        );
    }
}
