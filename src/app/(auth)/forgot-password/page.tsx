"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArcadeSprite } from "@/components/arcade-sprite";
import { ArrowRight, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.push(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    };

    return (
        <div className="relative w-full">
            <span className="kq-sticker absolute -top-3 left-4 z-10 rotate-[-6deg] px-2.5 py-1.5">
                RESET
                <br />
                ACCESS!
            </span>

            <div className="kq-card">
                <div className="kq-art flex items-center justify-between gap-3 px-4 py-3">
                    <span className="grid size-11 shrink-0 rotate-[4deg] place-items-center border-[3px] border-[#211543] bg-[var(--paper)] shadow-[2px_2px_0_#211543]">
                        <ArcadeSprite kind="bot" className="size-7" />
                    </span>
                    <span className="kq-badge kq-badge-cyan">RECOVERY MODE</span>
                </div>

                <div className="p-5 sm:p-6">
                    <p className="kq-overline">PASSWORD / RESET</p>
                    <h1 className="kq-title mt-1.5 text-[1.6rem]">ลืมรหัสผ่าน?</h1>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">
                        กรอกอีเมลของบัญชีเพื่อไปตั้งรหัสผ่านใหม่
                    </p>

                    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                        <div>
                            <label htmlFor="email" className="kq-label">อีเมล</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="name@example.com"
                                autoComplete="email"
                                required
                                className="kq-input"
                            />
                        </div>
                        <button type="submit" className="kq-btn kq-btn-yellow kq-btn-block">
                            <Mail className="size-5" />
                            ดำเนินการต่อ
                            <ArrowRight className="size-5" />
                        </button>
                    </form>

                    <hr className="kq-divider my-4" />
                    <p className="text-center text-sm font-semibold text-muted-foreground">
                        นึกรหัสผ่านออกแล้ว?{" "}
                        <Link href="/login" className="font-bold text-[#6234dc] hover:underline dark:text-[var(--sunny)]">
                            เข้าสู่ระบบ
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
