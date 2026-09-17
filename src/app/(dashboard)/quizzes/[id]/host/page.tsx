"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeading } from "@/components/page-heading";
import { ArcadeSprite } from "@/components/arcade-sprite";
import { Gamepad2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StartHostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: quizId } = use(params);
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
            return;
        }

        if (!authLoading && isAuthenticated && !isCreating) {
            createGameSession();
        }
    }, [authLoading, isAuthenticated]);

    const createGameSession = async () => {
        setIsCreating(true);

        try {
            const res = await fetch("/api/games", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quizId }),
            });

            const data = await res.json();

            if (data.success) {
                // Redirect to host page with the new game PIN
                router.replace(`/host/${data.data.pin}`);
            } else {
                toast.error(data.error || "ไม่สามารถสร้างเกมได้");
                router.push(`/quizzes/${quizId}/edit`);
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
            router.push(`/quizzes/${quizId}/edit`);
        }
    };

    return (
        <div className="kq-shell-tight">
            <PageHeading
                overline="HOST / LIVE ROOM"
                title="กำลังเปิดห้องเกม..."
                description="ระบบกำลังเตรียมห้อง PIN ของคุณ อีกสักครู่จะพาไปหน้าจอโฮสต์ให้อัตโนมัติ"
            />

            <div className="kq-card relative p-6 text-center sm:p-10">
                <span className="kq-sticker absolute -top-4 right-6 z-10 rotate-[7deg] px-3 py-2">
                    GET
                    <br />
                    READY!
                </span>

                <div className="grid place-items-center gap-5">
                    <span className="grid size-24 place-items-center border-[3px] border-line bg-[var(--arcade-deep)] shadow-hard">
                        <ArcadeSprite
                            kind="bot"
                            className="size-16 animate-float"
                            title="หุ่นยนต์พิกเซล KaQuiz"
                        />
                    </span>

                    <p className="kq-pixel text-[9px] text-[var(--candy)]">LOADING ROOM...</p>

                    <div>
                        <h2 className="text-xl font-bold text-ink">กำลังสร้างเกม...</h2>
                        <p className="mt-2 text-sm font-medium leading-loose text-muted-foreground">
                            เก็บ PIN ไว้แชร์ให้ทุกคนในห้อง แล้วเริ่มแข่งกันได้เลย
                        </p>
                    </div>

                    {isCreating ? (
                        <div className="flex items-center gap-3">
                            <Loader2 className="size-6 animate-spin text-[var(--arcade)]" />
                            <span className="text-sm font-bold text-ink">
                                กำลังสร้างห้องและรหัส PIN
                            </span>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={createGameSession}
                            className="kq-btn kq-btn-yellow kq-btn-lg"
                        >
                            <Gamepad2 className="size-5" />
                            เปิดห้องโฮสต์
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
