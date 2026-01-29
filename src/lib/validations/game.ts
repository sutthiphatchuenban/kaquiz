import { z } from "zod";

export const joinGameSchema = z.object({
    pin: z
        .string()
        .length(6, "Game PIN ต้องมี 6 หลัก")
        .regex(/^\d+$/, "Game PIN ต้องเป็นตัวเลขเท่านั้น"),
    nickname: z
        .string()
        .min(1, "กรุณากรอกชื่อเล่น")
        .max(20, "ชื่อเล่นต้องไม่เกิน 20 ตัวอักษร"),
});

export const submitAnswerSchema = z.object({
    questionId: z.string().cuid(),
    answerId: z.string().cuid().optional(), // optional for TYPE_ANSWER
    typedAnswer: z.string().optional(), // for TYPE_ANSWER type
    responseTime: z.number().int().min(0), // milliseconds
});

export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
