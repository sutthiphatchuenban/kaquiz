"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, Copy, Loader2, FileQuestion, Clock, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";

interface PublicDetail {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    difficulty: string | null;
    playCount: number;
    copyCount: number;
    userId: string;
    author: { name: string };
    _count: { questions: number; gameSessions: number };
    questions: {
        id: string;
        questionText: string;
        type: string;
        timeLimit: number;
        points: number;
        order: number;
        answers: { id: string; answerText: string; color: string; order: number }[];
    }[];
}

export default function LibraryDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { isAuthenticated, checkAuth } = useAuthStore();
    const [quiz, setQuiz] = useState<PublicDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isHosting, setIsHosting] = useState(false);
    const [isForking, setIsForking] = useState(false);

    useEffect(() => { checkAuth(); }, [checkAuth]);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/quizzes/public/${id}`);
                const data = await res.json();
                if (data.success) setQuiz(data.data);
                else {
                    toast.error(data.error || "ไม่พบ Quiz");
                    router.push("/library");
                }
            } catch {
                toast.error("เกิดข้อผิดพลาด");
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [id, router]);

    const requireLogin = () => {
        if (!isAuthenticated) {
            router.push(`/login?from=/library/${id}`);
            return true;
        }
        return false;
    };

    const handleHost = async () => {
        if (requireLogin()) return;
        setIsHosting(true);
        try {
            const res = await fetch("/api/games", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quizId: id }),
            });
            const data = await res.json();
            if (data.success) router.replace(`/host/${data.data.pin}`);
            else toast.error(data.error || "สร้างห้องไม่สำเร็จ");
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsHosting(false);
        }
    };

    const handleFork = async () => {
        if (requireLogin()) return;
        setIsForking(true);
        try {
            const res = await fetch(`/api/quizzes/${id}/fork`, { method: "POST" });
            const data = await res.json();
            if (data.success) {
                toast.success("คัดลอกสำเร็จ ไปแก้ไขต่อได้เลย");
                router.push(`/quizzes/${data.data.id}/edit`);
            } else toast.error(data.error || "คัดลอกไม่สำเร็จ");
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsForking(false);
        }
    };

    if (isLoading) {
        return <Skeleton className="h-72" />;
    }

    if (!quiz) return null;

    return (
        <>
            <Link href="/library" className="kq-btn kq-btn-sm kq-btn-paper mb-6">
                <ArrowLeft className="size-4" /> กลับคลัง
            </Link>
            <PageHeading
                overline="PUBLIC QUIZ"
                title={quiz.title}
                description={quiz.description || "ไม่มีคำอธิบาย"}
                actions={
                    <>
                        <button type="button" onClick={handleHost} disabled={isHosting} className="kq-btn kq-btn-yellow">
                            {isHosting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                            โฮสต์เลย
                        </button>
                        <button type="button" onClick={handleFork} disabled={isForking} className="kq-btn kq-btn-paper">
                            {isForking ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                            คัดลอกมาแก้
                        </button>
                    </>
                }
            />

            <div className="mb-7 flex flex-wrap gap-2">
                <span className="kq-badge kq-badge-cyan">{quiz._count.questions} ข้อ</span>
                <span className="kq-badge kq-badge-peach">เล่น {quiz.playCount} ครั้ง</span>
                <span className="kq-badge">ก๊อป {quiz.copyCount} ครั้ง</span>
                {quiz.category ? <span className="kq-badge">{quiz.category}</span> : null}
                {quiz.difficulty ? <span className="kq-badge kq-badge-grape">{quiz.difficulty}</span> : null}
                <span className="kq-badge">โดย {quiz.author.name}</span>
            </div>

            <div className="grid gap-5">
                {quiz.questions.map((q, i) => (
                    <article key={q.id} className="kq-card p-5">
                        <h3 className="font-bold text-ink">ข้อ {i + 1}. {q.questionText}</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <span className="kq-badge kq-badge-cyan"><Clock className="size-3" />{q.timeLimit}s</span>
                            <span className="kq-badge kq-badge-mint"><Trophy className="size-3" />{q.points}</span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {q.answers.map((a) => (
                                <div key={a.id} className="flex items-center gap-2 border-[3px] border-line bg-paper px-3 py-2">
                                    <FileQuestion className="size-4 text-muted-foreground" />
                                    <span className="truncate text-sm font-bold">{a.answerText}</span>
                                </div>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
        </>
    );
}
