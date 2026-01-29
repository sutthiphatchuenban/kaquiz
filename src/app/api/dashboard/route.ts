import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "kaquiz-super-secret-key-change-in-production"
);

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth-token")?.value;

        if (!token) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = payload.id as string;

        // Stats
        const quizCount = await prisma.quiz.count({ where: { userId } });

        const gameSessions = await prisma.gameSession.findMany({
            where: { quiz: { userId } },
            select: {
                id: true,
                _count: {
                    select: { players: true }
                }
            }
        });

        const gameCount = gameSessions.length;
        const totalPlayers = gameSessions.reduce((acc: number, curr: { _count: { players: number } }) => acc + curr._count.players, 0);

        // Calculate average score
        const playersWithScore = await prisma.player.aggregate({
            where: {
                session: { quiz: { userId } },
                score: { gt: 0 }
            },
            _avg: { score: true }
        });

        const averageScore = Math.round(playersWithScore._avg?.score || 0);

        // Recent Quizzes
        const recentQuizzes = await prisma.quiz.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                description: true,
                _count: {
                    select: { questions: true }
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                quizCount,
                gameCount,
                totalPlayers,
                averageScore,
                recentQuizzes
            }
        });

    } catch (error) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
