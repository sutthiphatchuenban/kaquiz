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
    order: z.number().int().min(0),
    answers: z.array(answerSchema).min(2, "ต้องมีคำตอบอย่างน้อย 2 ตัวเลือก"),
});

export const quizSchema = z.object({
    title: z
        .string()
        .min(1, "กรุณากรอกชื่อ Quiz")
        .max(100, "ชื่อ Quiz ต้องไม่เกิน 100 ตัวอักษร"),
    description: z.string().max(500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร").optional(),
    coverImage: z.string().url().optional().nullable(),
});

export const createQuizSchema = quizSchema;

export const updateQuizSchema = quizSchema.partial();

export type AnswerInput = z.infer<typeof answerSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type QuizInput = z.infer<typeof quizSchema>;
export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
