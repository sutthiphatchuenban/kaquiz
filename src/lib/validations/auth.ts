import { z } from "zod";

export const registerSchema = z.object({
    name: z
        .string()
        .min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร")
        .max(50, "ชื่อต้องไม่เกิน 50 ตัวอักษร"),
    email: z
        .string()
        .email("กรุณากรอกอีเมลให้ถูกต้อง"),
    password: z
        .string()
        .min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
        .max(100, "รหัสผ่านต้องไม่เกิน 100 ตัวอักษร"),
});

export const loginSchema = z.object({
    email: z.string().email("กรุณากรอกอีเมลให้ถูกต้อง"),
    password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
