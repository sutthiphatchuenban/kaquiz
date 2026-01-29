import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";
import type { ApiResponse, AuthUser } from "@/types";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "kaquiz-super-secret-key-change-in-production"
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const result = loginSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: result.error.issues[0].message,
                },
                { status: 400 }
            );
        }

        const { email, password } = result.data;

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
                },
                { status: 401 }
            );
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
                },
                { status: 401 }
            );
        }

        // Create JWT token
        const token = await new SignJWT({
            id: user.id,
            email: user.email,
            name: user.name,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("30d")
            .sign(JWT_SECRET);

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set("auth-token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: "/",
        });

        const authUser: AuthUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
        };

        return NextResponse.json<ApiResponse<AuthUser>>({
            success: true,
            data: authUser,
            message: "เข้าสู่ระบบสำเร็จ",
        });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
            },
            { status: 500 }
        );
    }
}
