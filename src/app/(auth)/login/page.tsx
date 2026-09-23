"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/auth-store";
import { ArcadeSprite } from "@/components/arcade-sprite";
import { Loader2, LogIn } from "lucide-react";
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
            const from = new URLSearchParams(window.location.search).get("from");
            const destination = from ? new URL(from, window.location.origin) : null;
            router.push(
                destination?.origin === window.location.origin
                    ? `${destination.pathname}${destination.search}${destination.hash}`
                    : "/dashboard"
            );
        } else {
            toast.error(result.error || "เข้าสู่ระบบไม่สำเร็จ");
        }
    };

    return (
        <div className="relative w-full">
            <span className="kq-sticker absolute -top-3 left-4 z-10 rotate-[-6deg] px-2.5 py-1.5">
                PLAYER 1
                <br />
                READY!
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
                    <span className="kq-badge kq-badge-cyan">INSERT COIN</span>
                </div>

                <div className="p-5 sm:p-6">
                    <p className="kq-overline">01 / SIGN IN</p>
                    <h1 className="kq-title mt-1.5 text-[1.6rem]">ยินดีต้อนรับกลับมา!</h1>

                    <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-3.5">
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
                                autoComplete="current-password"
                                {...register("password")}
                                disabled={isLoading}
                                className="kq-input"
                            />
                            {errors.password && (
                                <p className="kq-error">{errors.password.message}</p>
                            )}
                            <div className="mt-2 text-right">
                                <Link
                                    href="/forgot-password"
                                    className="text-sm font-bold text-[#6234dc] hover:underline dark:text-[var(--sunny)]"
                                >
                                    ลืมรหัสผ่าน?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="kq-btn kq-btn-yellow kq-btn-block mt-1"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="size-5 animate-spin" />
                                    กำลังเข้าสู่ระบบ...
                                </>
                            ) : (
                                <>
                                    <LogIn className="size-5" />
                                    เข้าสู่ระบบ
                                </>
                            )}
                        </button>
                    </form>

                    <hr className="kq-divider my-4" />

                    <p className="text-center text-sm font-semibold text-muted-foreground">
                        ยังไม่มีบัญชี?{" "}
                        <Link
                            href="/register"
                            className="font-bold text-[#6234dc] hover:underline dark:text-[var(--sunny)]"
                        >
                            ลงทะเบียน
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
