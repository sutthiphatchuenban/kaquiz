"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ArcadeSprite } from "@/components/arcade-sprite";

function JoinForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [gamePin, setGamePin] = useState(searchParams?.get("pin") || "");

    const handleJoin = () => {
        if (gamePin.length !== 6) {
            toast.error("Game PIN ต้องมี 6 หลัก");
            return;
        }
        router.push(`/play/${gamePin}`);
    };

    return (
        <div className="grid min-h-dvh place-items-center px-4 py-10">
            <div className="relative w-full max-w-md">
                <span className="kq-sticker absolute -right-3 -top-5 z-10 rotate-[8deg] px-3 py-2">
                    PLAYER 1
                    <br />
                    READY!
                </span>

                <div className="kq-card">
                    <div className="kq-art relative grid place-items-center py-7">
                        <span className="kq-badge kq-badge-cyan absolute left-3 top-3">
                            INSERT COIN
                        </span>
                        <span className="grid size-24 rotate-[-4deg] place-items-center border-[3px] border-line bg-[var(--paper)] shadow-hard-sm">
                            <ArcadeSprite kind="bot" className="size-16" />
                        </span>
                    </div>

                    <div className="p-6 sm:p-7">
                        <p className="kq-overline">01 / JOIN GAME</p>
                        <h1 className="kq-title mt-2">เข้าร่วมเกม</h1>
                        <p className="kq-subtitle mt-2 text-sm">
                            ใส่ Game PIN จากหน้าจอ Host
                        </p>

                        <div className="mt-6">
                            <label htmlFor="game-pin" className="kq-label">
                                Game PIN
                            </label>
                            <input
                                id="game-pin"
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={6}
                                placeholder="000000"
                                value={gamePin}
                                onChange={(e) =>
                                    setGamePin(e.target.value.replace(/\D/g, "").slice(0, 6))
                                }
                                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                                className="kq-input kq-pixel-lg h-16 text-center text-2xl tracking-[0.35em]"
                                aria-label="กรอก Game PIN 6 หลัก"
                            />

                            <div className="mt-3 flex justify-center gap-2" aria-hidden>
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <span
                                        key={i}
                                        className={`h-2 w-6 border-2 border-line ${
                                            i < gamePin.length
                                                ? "bg-[var(--arcade)]"
                                                : "bg-transparent"
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleJoin}
                            disabled={gamePin.length !== 6}
                            className="kq-btn kq-btn-yellow kq-btn-block kq-btn-lg mt-5"
                        >
                            เข้าร่วม
                            <ChevronRight className="size-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 border-t-[3px] border-line" aria-hidden>
                        <span className="h-3 bg-[var(--candy)]" />
                        <span className="h-3 bg-[var(--electric)]" />
                        <span className="h-3 bg-[var(--sunny)]" />
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-sm font-bold text-[var(--on-arcade)] opacity-80">
                        ไม่มี Game PIN?{" "}
                        <Link
                            href="/register"
                            className="text-[var(--sunny)] underline decoration-[3px] underline-offset-4"
                        >
                            สร้างเกมของคุณเอง
                        </Link>
                    </p>

                    <div className="mt-3 flex justify-center">
                        <Link href="/" className="kq-btn kq-btn-ghost kq-btn-sm">
                            กลับหน้าหลัก
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function JoinPage() {
    return (
        <Suspense
            fallback={
                <div className="grid min-h-dvh place-items-center">
                    <Loader2 className="size-12 animate-spin text-[var(--sunny)] opacity-70" />
                </div>
            }
        >
            <JoinForm />
        </Suspense>
    );
}
