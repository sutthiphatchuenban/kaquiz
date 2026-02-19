"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginInput) => {
        setIsLoading(true);
        const result = await login(data.email, data.password);
        setIsLoading(false);

        if (result.success) {
            toast.success("เข้าสู่ระบบสำเร็จ!");
            router.push("/dashboard");
        } else {
            toast.error(result.error || "เข้าสู่ระบบไม่สำเร็จ");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center gradient-kahoot p-4">
            <Card className="w-full max-w-md border-none shadow-2xl">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <img src="/favicon.ico" alt="KaQuiz" className="w-16 h-16 rounded-2xl object-contain" />
                    </div>
                    <CardTitle className="text-2xl font-bold">ยินดีต้อนรับกลับมา!</CardTitle>
                    <CardDescription>เข้าสู่ระบบเพื่อสร้างและเล่น Quiz</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">อีเมล</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                {...register("email")}
                                disabled={isLoading}
                                className="h-12"
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">รหัสผ่าน</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                {...register("password")}
                                disabled={isLoading}
                                className="h-12"
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive">{errors.password.message}</p>
                            )}
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-semibold"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    กำลังเข้าสู่ระบบ...
                                </>
                            ) : (
                                <>
                                    <LogIn className="mr-2 h-4 w-4" />
                                    เข้าสู่ระบบ
                                </>
                            )}
                        </Button>
                    </form>
                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        ยังไม่มีบัญชี?{" "}
                        <Link href="/register" className="text-primary font-medium hover:underline">
                            ลงทะเบียน
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
