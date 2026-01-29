import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ApiResponse } from "@/types";

export async function POST() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete("auth-token");

        return NextResponse.json<ApiResponse>({
            success: true,
            message: "ออกจากระบบสำเร็จ",
        });
    } catch (error) {
        console.error("Logout error:", error);
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: "เกิดข้อผิดพลาด",
            },
            { status: 500 }
        );
    }
}
