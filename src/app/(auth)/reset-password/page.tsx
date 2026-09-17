"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArcadeSprite } from "@/components/arcade-sprite";
import { readApiResponse } from "@/lib/api-response";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams?.get("email") || "";
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!email) {
            toast.error("กรุณากรอกอีเมลก่อน");
            router.push("/forgot-password");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await readApiResponse(response);

            if (!data.success) {
                toast.error(data.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
                return;
            }

            toast.success("เปลี่ยนรหัสผ่านสำเร็จ");
            router.push("/login");
        } catch {
            toast.error("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full">
            <span className="kq-sticker absolute -top-3 left-4 z-10 rotate-[-6deg] px-2.5 py-1.5">
                NEW
                <br />
                PASSWORD!
            </span>

            <div className="kq-card">
                <div className="kq-art flex items-center justify-between gap-3 px-4 py-3">
                    <span className="grid size-11 shrink-0 rotate-[4deg] place-items-center border-[3px] border-[#211543] bg-[var(--paper)] shadow-[2px_2px_0_#211543]">
                        <ArcadeSprite kind="bot" className="size-7" />
                    </span>
                    <span className="kq-badge kq-badge-mint">FINAL STEP</span>
                </div>

                <div className="p-5 sm:p-6">
                    <p className="kq-overline">PASSWORD / NEW</p>
                    <h1 className="kq-title mt-1.5 text-[1.6rem]">ตั้งรหัสผ่านใหม่</h1>
                    <p className="mt-2 break-all text-sm font-semibold text-muted-foreground">{email}</p>

                    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                        <div>
                            <label htmlFor="password" className="kq-label">รหัสผ่านใหม่</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="อย่างน้อย 6 ตัวอักษร"
                                autoComplete="new-password"
                                minLength={6}
                                maxLength={100}
                                required
                                disabled={isLoading}
                                className="kq-input"
                            />
                        </div>
                        <button disabled={isLoading} className="kq-btn kq-btn-yellow kq-btn-block">
                            {isLoading ? <Loader2 className="size-5 animate-spin" /> : <KeyRound className="size-5" />}
                            {isLoading ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
                        </button>
                    </form>

                    <hr className="kq-divider my-4" />
                    <p className="text-center text-sm font-semibold text-muted-foreground">
                        <Link href="/forgot-password" className="font-bold text-[#6234dc] hover:underline dark:text-[var(--sunny)]">
                            เปลี่ยนอีเมล
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<Loader2 className="mx-auto size-10 animate-spin text-[var(--sunny)]" />}>
            <ResetPasswordForm />
        </Suspense>
    );
}
