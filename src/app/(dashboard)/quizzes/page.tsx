"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import {
    Edit,
    FileQuestion,
    Play,
    Plus,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface Quiz {
    id: string;
    title: string;
    description: string | null;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
    _count: {
        questions: number;
        gameSessions: number;
    };
}

const ART_TINTS = ["var(--grape)", "var(--arcade)", "var(--candy)"];

export default function QuizzesPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchQuizzes();
        }
    }, [isAuthenticated]);

    const fetchQuizzes = async () => {
        try {
            const res = await fetch("/api/quizzes");
            const data = await res.json();
            if (data.success) {
                setQuizzes(data.data);
            }
        } catch {
            toast.error("ไม่สามารถโหลด Quiz ได้");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const res = await fetch(`/api/quizzes/${deleteId}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (data.success) {
                setQuizzes(quizzes.filter(q => q.id !== deleteId));
                toast.success("ลบ Quiz สำเร็จ");
            } else {
                toast.error(data.error || "ลบ Quiz ไม่สำเร็จ");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setDeleteId(null);
        }
    };

    if (authLoading) {
        return (
            <div>
                <Skeleton className="h-10 w-56" />
                <Skeleton className="mt-3 h-5 w-72" />
                <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-72" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <PageHeading
                overline="01 / QUIZ LIBRARY"
                title="Quiz ของฉัน"
                description="จัดการ Quiz ทั้งหมดของคุณ — แก้ไข โฮสต์ หรือลบได้จากที่นี่"
                actions={
                    <Link href="/quizzes/new" className="kq-btn kq-btn-yellow">
                        <Plus className="size-4" />
                        สร้าง Quiz
                    </Link>
                }
            />

            {isLoading ? (
                <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-72" />
                    ))}
                </div>
            ) : quizzes.length === 0 ? (
                <EmptyState
                    title="ยังไม่มี Quiz"
                    description="เริ่มต้นสร้าง Quiz แรกของคุณเลย!"
                    icon={<FileQuestion className="size-8 text-ink" />}
                    action={
                        <Link href="/quizzes/new" className="kq-btn kq-btn-yellow">
                            <Plus className="size-4" />
                            สร้าง Quiz
                        </Link>
                    }
                />
            ) : (
                <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                    {quizzes.map((quiz, index) => (
                        <article
                            key={quiz.id}
                            className="kq-card kq-card-hover flex flex-col"
                        >
                            <div
                                className="kq-art relative grid h-32 place-items-center"
                                style={{ backgroundColor: ART_TINTS[index % ART_TINTS.length] }}
                            >
                                <span className="kq-badge absolute left-3 top-3">
                                    QUIZ {String(index + 1).padStart(2, "0")}
                                </span>

                                <span className="grid size-20 rotate-[4deg] place-items-center border-[3px] border-line bg-paper shadow-hard-sm">
                                    <FileQuestion className="size-9 text-ink" strokeWidth={2.4} />
                                </span>
                            </div>

                            <div className="flex flex-1 flex-col gap-3 p-5">
                                <h2 className="truncate text-xl font-bold text-ink" title={quiz.title}>
                                    {quiz.title}
                                </h2>
                                <p className="line-clamp-2 flex-1 text-sm font-medium text-muted-foreground">
                                    {quiz.description || "ไม่มีคำอธิบาย"}
                                </p>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="kq-badge kq-badge-cyan">
                                        {quiz._count.questions} คำถาม
                                    </span>
                                    <span className="kq-badge kq-badge-peach">
                                        {quiz._count.gameSessions} เกม
                                    </span>
                                </div>

                                <div className="mt-1 flex flex-wrap gap-2 border-t-2 border-dashed border-line/30 pt-4">
                                    <Link
                                        href={`/quizzes/${quiz.id}/edit`}
                                        className="kq-btn kq-btn-sm kq-btn-paper flex-1"
                                    >
                                        <Edit className="size-4" />
                                        แก้ไข
                                    </Link>
                                    <Link
                                        href={`/quizzes/${quiz.id}/host`}
                                        className="kq-btn kq-btn-sm kq-btn-yellow flex-1"
                                    >
                                        <Play className="size-4" />
                                        โฮสต์
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => setDeleteId(quiz.id)}
                                        className="kq-btn kq-btn-sm kq-btn-danger"
                                        aria-label={`ลบ Quiz ${quiz.title}`}
                                    >
                                        <Trash2 className="size-4" />
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogMedia>
                            <Trash2 />
                        </AlertDialogMedia>
                        <AlertDialogTitle>ยืนยันการลบ Quiz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            การลบนี้จะไม่สามารถกู้คืนได้ คำถามและข้อมูลทั้งหมดจะถูกลบไปด้วย
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDelete}>
                            ลบ Quiz
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
