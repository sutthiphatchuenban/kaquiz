import type { Prisma, PrismaClient } from "@/generated/prisma";
import { calculatePoints } from "../auth";

// Grace permits network transit only; it never permits answers outside QUESTION.
export const ANSWER_NETWORK_GRACE_MS = 1500;

export class SubmitAnswerError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

function isId(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function parseSubmission(body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new SubmitAnswerError(400, "ข้อมูลไม่ถูกต้อง กรุณาส่งคำตอบอีกครั้ง");
    }
    const { playerId, questionId, answerId, responseTime } = body as Record<string, unknown>;
    if (!isId(playerId) || !isId(questionId) ||
        (answerId !== undefined && answerId !== null && !isId(answerId)) ||
        typeof responseTime !== "number" || !Number.isFinite(responseTime) || responseTime < 0) {
        throw new SubmitAnswerError(400, "ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง กรุณาตรวจสอบผู้เล่น คำถาม ตัวเลือก และเวลาตอบ");
    }
    return { playerId, questionId, answerId: answerId ?? null, responseTime };
}

function savedResult(answer: {
    id: string; questionId: string; answerId: string | null;
    isCorrect: boolean; pointsEarned: number;
}, score: number) {
    return {
        questionId: answer.questionId,
        isCorrect: answer.isCorrect,
        pointsEarned: answer.pointsEarned,
        answerId: answer.id,
        selectedAnswerId: answer.answerId,
        score,
    };
}

export async function submitGameAnswer(
    db: Pick<PrismaClient, "$transaction">,
    pin: string,
    body: unknown,
    now: () => number = Date.now,
) {
    const { playerId, questionId, answerId } = parseSubmission(body);
    const receivedAt = now();

    return db.$transaction(async (tx: Prisma.TransactionClient) => {
        // A shared session lock keeps host transitions from racing acceptance, while
        // allowing different players to submit concurrently. Values are parameterized.
        await tx.$queryRaw`SELECT id FROM game_sessions WHERE pin = ${pin} FOR SHARE`;
        const session = await tx.gameSession.findUnique({ where: { pin } });
        if (!session) throw new SubmitAnswerError(404, "ไม่พบเกมนี้");

        const member = await tx.player.findUnique({ where: { id: playerId } });
        if (!member || member.sessionId !== session.id) {
            throw new SubmitAnswerError(404, "ไม่พบผู้เล่นในเกมนี้ กรุณาเข้าร่วมเกมอีกครั้ง");
        }

        // PostgreSQL UPDATE locks this player until commit. Under READ COMMITTED,
        // a waiting retry sees the first submission's committed answer and score.
        const player = await tx.player.update({
            where: { id: playerId },
            data: { score: { increment: 0 } },
        });
        const question = await tx.question.findFirst({
            where: { id: questionId, quizId: session.quizId },
        });
        if (!question) {
            throw new SubmitAnswerError(400, "คำถามนี้ไม่อยู่ในเกม กรุณาโหลดคำถามปัจจุบันใหม่");
        }
        const choice = answerId === null ? null : await tx.answer.findFirst({
            where: { id: answerId, questionId },
        });
        if (answerId !== null && !choice) {
            throw new SubmitAnswerError(400, "ตัวเลือกไม่ตรงกับคำถาม กรุณาโหลดคำถามใหม่แล้วเลือกอีกครั้ง");
        }

        const existing = await tx.playerAnswer.findFirst({ where: { playerId, questionId } });
        // A retry restores the original choice/result, even after the game advances.
        if (existing) return savedResult(existing, player.score);

        if (session.status !== "QUESTION") {
            throw new SubmitAnswerError(409, "ปิดรับคำตอบแล้ว กรุณารอคำถามถัดไปหรือโหลดสถานะเกมใหม่");
        }
        const currentQuestion = await tx.question.findFirst({
            where: { quizId: session.quizId },
            orderBy: { order: "asc" },
            skip: session.currentQuestionIndex,
        });
        if (currentQuestion?.id !== questionId) {
            throw new SubmitAnswerError(409, "คำถามเปลี่ยนแล้ว กรุณาโหลดคำถามปัจจุบันใหม่ก่อนตอบ");
        }
        if (!session.startedAt) {
            throw new SubmitAnswerError(409, "คำถามยังไม่เริ่ม กรุณาโหลดสถานะเกมใหม่แล้วลองอีกครั้ง");
        }
        const responseTime = Math.max(0, receivedAt - session.startedAt.getTime());
        const timeLimitMs = question.timeLimit * 1000;
        if (responseTime > timeLimitMs + ANSWER_NETWORK_GRACE_MS) {
            throw new SubmitAnswerError(409, "หมดเวลาตอบคำถามนี้แล้ว กรุณารอคำถามถัดไป");
        }
        const isCorrect = choice?.isCorrect ?? false;
        const pointsEarned = calculatePoints(isCorrect, responseTime, timeLimitMs, question.points);
        const saved = await tx.playerAnswer.create({
            data: { playerId, questionId, answerId, isCorrect, responseTime, pointsEarned },
        });
        const updated = await tx.player.update({
            where: { id: playerId },
            data: { score: { increment: pointsEarned } },
        });
        return savedResult(saved, updated.score);
    }, { isolationLevel: "ReadCommitted" });
}
