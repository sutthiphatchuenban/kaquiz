"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/auth-store";
import { ArcadeSprite } from "@/components/arcade-sprite";
import { Loader2, UserPlus } from "lucide-react";
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
        <div className="relative w-full">
            <span className="kq-sticker absolute -top-3 left-4 z-10 rotate-[-6deg] px-2.5 py-1.5">
                NEW
                <br />
                PLAYER!
            </span>

            <div className="kq-card">
                {/* slim arcade title bar */}
                <div className="kq-art flex items-center justify-between gap-3 px-4 py-3">
                    <span className="grid size-11 shrink-0 rotate-[4deg] place-items-center border-[3px] border-[#211543] bg-[var(--paper)] shadow-[2px_2px_0_#211543]">
                        <ArcadeSprite
                            kind="bot"
                            className="size-7"
                            title="หุ่นยนต์พิกเซล KaQuiz"
                        />
                    </span>
                    <span className="kq-badge kq-badge-mint">LV.01 START</span>
                </div>

                <div className="p-5 sm:p-6">
                    <p className="kq-overline">02 / SIGN UP</p>
                    <h1 className="kq-title mt-1.5 text-[1.6rem]">สร้างบัญชีใหม่</h1>

                    <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-3.5">
                        <div>
                            <label htmlFor="name" className="kq-label">
                                ชื่อ
                            </label>
                            <input
                                id="name"
                                type="text"
                                placeholder="ชื่อของคุณ"
                                autoComplete="name"
                                {...register("name")}
                                disabled={isLoading}
                                className="kq-input"
                            />
                            {errors.name && (
                                <p className="kq-error">{errors.name.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="email" className="kq-label">
                                อีเมล
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                autoComplete="email"
                                {...register("email")}
                                disabled={isLoading}
                                className="kq-input"
                            />
                            {errors.email && (
                                <p className="kq-error">{errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="kq-label">
                                รหัสผ่าน
                            </label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                autoComplete="new-password"
                                {...register("password")}
                                disabled={isLoading}
                                className="kq-input"
                            />
                            {errors.password && (
                                <p className="kq-error">{errors.password.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="kq-btn kq-btn-yellow kq-btn-block mt-1"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="size-5 animate-spin" />
                                    กำลังลงทะเบียน...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="size-5" />
                                    ลงทะเบียน
                                </>
                            )}
                        </button>
                    </form>

                    <hr className="kq-divider my-4" />

                    <p className="text-center text-sm font-semibold text-muted-foreground">
                        มีบัญชีอยู่แล้ว?{" "}
                        <Link
                            href="/login"
                            className="font-bold text-[#6234dc] hover:underline dark:text-[var(--sunny)]"
                        >
                            เข้าสู่ระบบ
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
