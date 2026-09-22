import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { publicQuizQuerySchema } from "@/lib/validations/quiz";
import type { ApiResponse } from "@/types";

// GET /api/quizzes/public - คลังสาธารณะ (public, ไม่ต้อง login)
export async function GET(request: NextRequest) {
    try {
        const params = Object.fromEntries(request.nextUrl.searchParams.entries());
        const parsed = publicQuizQuerySchema.safeParse(params);

        if (!parsed.success) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const { search, category, difficulty, sort, page, limit } = parsed.data;

        const where = {
            isPublished: true,
            ...(category ? { category } : {}),
            ...(difficulty ? { difficulty } : {}),
            ...(search
                ? {
                      OR: [
                          { title: { contains: search, mode: "insensitive" as const } },
                          { description: { contains: search, mode: "insensitive" as const } },
                      ],
                  }
                : {}),
        };

        const orderBy =
            sort === "popular"
                ? { playCount: "desc" as const }
                : sort === "copied"
                  ? { copyCount: "desc" as const }
                  : { publishedAt: "desc" as const };

        const [total, quizzes] = await Promise.all([
            prisma.quiz.count({ where }),
            prisma.quiz.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    coverImage: true,
                    category: true,
                    difficulty: true,
                    publishedAt: true,
                    playCount: true,
                    copyCount: true,
                    user: { select: { name: true } },
                    _count: { select: { questions: true, gameSessions: true } },
                },
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        return NextResponse.json<ApiResponse>({
            success: true,
            data: {
                quizzes: quizzes.map((q) => ({
                    ...q,
                    author: q.user,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.max(1, Math.ceil(total / limit)),
                },
            },
        });
    } catch (error) {
        console.error("Public quizzes error:", error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
