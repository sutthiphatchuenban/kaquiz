import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminUser } from "@/lib/server/admin-auth";
import type { ApiResponse } from "@/types";

export async function GET() {
    const admin = await getAdminUser();
    if (!admin) {
        return NextResponse.json<ApiResponse>(
            { success: false, error: "ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแล" },
            { status: 403 }
        );
    }

    try {
        const activeStatuses = ["LOBBY", "PLAYING", "QUESTION", "SHOWING_ANSWER", "LEADERBOARD"] as const;
        const [usersCount, quizzesCount, sessionsCount, playersCount, activeSessions, users, quizzes, sessions] =
            await Promise.all([
                prisma.user.count(),
                prisma.quiz.count(),
                prisma.gameSession.count(),
                prisma.player.count(),
                prisma.gameSession.count({ where: { status: { in: [...activeStatuses] } } }),
                prisma.user.findMany({
                    orderBy: { createdAt: "desc" },
                    take: 50,
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        createdAt: true,
                        _count: { select: { quizzes: true, gameSessions: true } },
                    },
                }),
                prisma.quiz.findMany({
                    orderBy: { createdAt: "desc" },
                    take: 50,
                    select: {
                        id: true,
                        title: true,
                        isPublished: true,
                        createdAt: true,
                        user: { select: { name: true, email: true } },
                        _count: { select: { questions: true, gameSessions: true } },
                    },
                }),
                prisma.gameSession.findMany({
                    orderBy: { createdAt: "desc" },
                    take: 50,
                    select: {
                        id: true,
                        pin: true,
                        status: true,
                        createdAt: true,
                        endedAt: true,
                        host: { select: { name: true, email: true } },
                        quiz: { select: { title: true } },
                        _count: { select: { players: true } },
                    },
                }),
            ]);

        return NextResponse.json({
            success: true,
            data: {
                stats: {
                    users: usersCount,
                    quizzes: quizzesCount,
                    sessions: sessionsCount,
                    players: playersCount,
                    activeSessions,
                },
                users,
                quizzes,
                sessions,
            },
        });
    } catch (error) {
        console.error("Admin overview error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "โหลดข้อมูลผู้ดูแลไม่สำเร็จ" },
            { status: 500 }
        );
    }
}
