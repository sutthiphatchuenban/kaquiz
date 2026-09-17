import "server-only";

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "kaquiz-super-secret-key-change-in-production"
);

function adminEmails(): Set<string> {
    return new Set(
        (process.env.ADMIN_EMAILS || "")
            .split(",")
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean)
    );
}

export function isAdminEmail(email: string): boolean {
    return adminEmails().has(email.trim().toLowerCase());
}

export async function getAdminUser() {
    const token = (await cookies()).get("auth-token")?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = typeof payload.id === "string" ? payload.id : null;
        if (!userId) return null;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true },
        });

        return user && isAdminEmail(user.email) ? user : null;
    } catch {
        return null;
    }
}
