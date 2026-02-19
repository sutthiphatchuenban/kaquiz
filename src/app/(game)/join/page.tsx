"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Play, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
        <div className="min-h-screen game-bg flex flex-col items-center justify-center p-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 mb-8">
                <img src="/favicon.ico" alt="KaQuiz" className="w-14 h-14 rounded-2xl object-contain" />
                <span className="text-3xl font-bold text-white">KaQuiz</span>
            </Link>

            {/* Join Card */}
            <Card className="w-full max-w-md border-none shadow-2xl">
                <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <Play className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">เข้าร่วมเกม</CardTitle>
                    <CardDescription>ใส่ Game PIN จากหน้าจอ Host</CardDescription>
                </CardHeader>
                <div className="px-6 pb-6 space-y-4">
                    <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Game PIN"
                        value={gamePin}
                        onChange={(e) => setGamePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="h-16 text-center text-3xl font-mono tracking-[0.5em] placeholder:tracking-normal placeholder:text-base"
                        maxLength={6}
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    />
                    <Button
                        onClick={handleJoin}
                        className="w-full h-14 text-lg font-semibold"
                        disabled={gamePin.length !== 6}
                    >
                        เข้าร่วม
                        <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
            </Card>

            {/* Footer */}
            <p className="text-white/50 text-sm mt-8">
                ไม่มี Game PIN?{" "}
                <Link href="/register" className="text-white underline">
                    สร้างเกมของคุณเอง
                </Link>
            </p>
        </div>
    );
}

export default function JoinPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen game-bg flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-white animate-spin opacity-50" />
            </div>
        }>
            <JoinForm />
        </Suspense>
    );
}
