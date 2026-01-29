"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Play, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function JoinPage() {
    const router = useRouter();
    const [gamePin, setGamePin] = useState("");

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
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-primary" />
                </div>
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
