import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validations/auth";
import type { ApiResponse, AuthUser } from "@/types";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const result = registerSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: result.error.issues[0].message,
                },
                { status: 400 }
            );
        }

        const { name, email, password } = result.data;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: "อีเมลนี้ถูกใช้งานแล้ว",
                },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
            },
        });

        return NextResponse.json<ApiResponse<AuthUser>>(
            {
                success: true,
                data: user,
                message: "ลงทะเบียนสำเร็จ",
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Register error:", error);
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
            },
            { status: 500 }
        );
    }
}
