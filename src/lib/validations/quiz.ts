import { z } from "zod";

export const answerSchema = z.object({
    answerText: z.string().min(1, "กรุณากรอกคำตอบ"),
    isCorrect: z.boolean().default(false),
    color: z.enum(["red", "blue", "green", "yellow"]),
    order: z.number().int().min(0),
});

export const questionSchema = z.object({
    questionText: z.string().min(1, "กรุณากรอกคำถาม"),
    type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "TYPE_ANSWER"]).default("MULTIPLE_CHOICE"),
    timeLimit: z.number().int().min(5).max(120).default(20),
    points: z.number().int().min(100).max(2000).default(1000),
    imageUrl: z.string().url().optional().nullable().or(z.literal("")),
    order: z.number({ error: "ต้องระบุลำดับ (order) เป็นตัวเลข" }).int().min(0, "ลำดับต้องไม่ติดลบ"),
    answers: z.array(answerSchema).min(2, "ต้องมีคำตอบอย่างน้อย 2 ตัวเลือก"),
});

/**
 * Updating a question may omit `order` — the position it already has is kept.
 * `answers` stays required because an update replaces the whole set, and
 * silently dropping them would wipe the question's choices.
 */
export const updateQuestionSchema = questionSchema.partial({ order: true });

export const DIFFICULTY_LEVELS = ["ง่าย", "ปานกลาง", "ยาก"] as const;

export const quizSchema = z.object({
    title: z
        .string()
        .min(1, "กรุณากรอกชื่อ Quiz")
        .max(100, "ชื่อ Quiz ต้องไม่เกิน 100 ตัวอักษร"),
    description: z.string().max(500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร").optional(),
    coverImage: z.string().url().optional().nullable().or(z.literal("")),
    isPublished: z.boolean().default(false),
    category: z.string().max(50, "หมวดหมู่ต้องไม่เกิน 50 ตัวอักษร").optional().nullable().or(z.literal("")),
    difficulty: z.enum(DIFFICULTY_LEVELS).optional().nullable(),
});

export const createQuizSchema = quizSchema;

export const updateQuizSchema = quizSchema.partial();

export const publishQuizSchema = z.object({
    isPublished: z.boolean(),
    category: z.string().max(50, "หมวดหมู่ต้องไม่เกิน 50 ตัวอักษร").optional().nullable().or(z.literal("")),
    difficulty: z.enum(DIFFICULTY_LEVELS).optional().nullable(),
});

export const publicQuizQuerySchema = z.object({
    search: z.string().max(100).optional(),
    category: z.string().max(50).optional(),
    difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
    sort: z.enum(["newest", "popular", "copied"]).default("newest"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type AnswerInput = z.infer<typeof answerSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type QuizInput = z.infer<typeof quizSchema>;
export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
