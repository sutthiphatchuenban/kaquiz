"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
    const router = useRouter();
    const { register: registerUser } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterInput) => {
        setIsLoading(true);
        const result = await registerUser(data.name, data.email, data.password);
        setIsLoading(false);

        if (result.success) {
            toast.success("ลงทะเบียนสำเร็จ!");
            router.push("/dashboard");
        } else {
            toast.error(result.error || "ลงทะเบียนไม่สำเร็จ");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center gradient-kahoot p-4">
            <Card className="w-full max-w-md border-none shadow-2xl">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">สร้างบัญชีใหม่</CardTitle>
                    <CardDescription>เริ่มต้นสร้าง Quiz สุดมันส์ของคุณ</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">ชื่อ</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="ชื่อของคุณ"
                                {...register("name")}
                                disabled={isLoading}
                                className="h-12"
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>
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
                                    กำลังลงทะเบียน...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    ลงทะเบียน
                                </>
                            )}
                        </Button>
                    </form>
                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        มีบัญชีอยู่แล้ว?{" "}
                        <Link href="/login" className="text-primary font-medium hover:underline">
                            เข้าสู่ระบบ
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
