import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validations/auth";
import type { ApiResponse } from "@/types";
import { isAdminEmail } from "@/lib/server/admin-auth";

export async function POST(request: NextRequest) {
    try {
        const result = resetPasswordSchema.safeParse(await request.json());
        if (!result.success) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const email = result.data.email.trim().toLowerCase();
        if (isAdminEmail(email)) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "บัญชีผู้ดูแลไม่สามารถรีเซ็ตรหัสผ่านด้วยวิธีนี้ได้" },
                { status: 403 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: "ไม่พบบัญชีที่ใช้อีเมลนี้" },
                { status: 404 }
            );
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { password: await hashPassword(result.data.password) },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            message: "เปลี่ยนรหัสผ่านสำเร็จ",
        });
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" },
            { status: 500 }
        );
    }
}
