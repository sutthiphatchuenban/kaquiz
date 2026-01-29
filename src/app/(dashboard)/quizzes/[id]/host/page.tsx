"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Loader2 } from "lucide-react";
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
        <div className="min-h-screen game-bg flex flex-col items-center justify-center text-white">
            <Loader2 className="w-16 h-16 animate-spin mb-4" />
            <h1 className="text-2xl font-bold">กำลังสร้างเกม...</h1>
        </div>
    );
}
