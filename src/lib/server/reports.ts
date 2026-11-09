import "server-only";

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";

export async function getReportUserId(): Promise<string | null> {
    const token = (await cookies()).get("auth-token")?.value;
    if (!token) return null;

    try {
        const secret = new TextEncoder().encode(
            process.env.JWT_SECRET || "kaquiz-super-secret-key-change-in-production"
        );
        const { payload } = await jwtVerify(token, secret);
        return typeof payload.id === "string" ? payload.id : null;
    } catch {
        return null;
    }
}

export function getReport(id: string, hostId: string) {
    return prisma.gameSession.findFirst({
        where: { id, hostId },
        select: {
            pin: true, status: true, createdAt: true, endedAt: true,
            currentQuestionIndex: true,
            quiz: {
                select: {
                    title: true,
                    questions: {
                        orderBy: { order: "asc" },
                        select: {
                            id: true, questionText: true,
                            answers: {
                                orderBy: { order: "asc" },
                                select: { answerText: true, isCorrect: true },
                            },
                        },
                    },
                },
            },
            players: {
                orderBy: [{ score: "desc" }, { joinedAt: "asc" }, { id: "asc" }],
                select: {
                    id: true, nickname: true, score: true,
                    answers: {
                        orderBy: { answeredAt: "asc" },
                        select: {
                            questionId: true, isCorrect: true,
                            responseTime: true, pointsEarned: true,
                            answer: { select: { answerText: true } },
                        },
                    },
                },
            },
        },
    });
}
