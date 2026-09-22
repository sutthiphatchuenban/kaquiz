"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FileQuestion, Play, Copy, Search } from "lucide-react";
import { toast } from "sonner";

interface PublicQuiz {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    category: string | null;
    difficulty: string | null;
    publishedAt: string | null;
    playCount: number;
    copyCount: number;
    author: { name: string };
    _count: { questions: number; gameSessions: number };
}

const DIFFICULTIES = ["ง่าย", "ปานกลาง", "ยาก"];
const SORTS = [
    { value: "newest", label: "ใหม่สุด" },
    { value: "popular", label: "เล่นเยอะสุด" },
    { value: "copied", label: "ก๊อปเยอะสุด" },
];

function LibraryContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<PublicQuiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState(searchParams?.get("search") || "");
    const [category, setCategory] = useState(searchParams?.get("category") || "");
    const [difficulty, setDifficulty] = useState(searchParams?.get("difficulty") || "");
    const [sort, setSort] = useState(searchParams?.get("sort") || "newest");
    const [page, setPage] = useState(Number(searchParams?.get("page") || "1"));

    const fetchLibrary = useCallback(async () => {
        setIsLoading(true);
        try {
            const q = new URLSearchParams();
            if (search) q.set("search", search);
            if (category) q.set("category", category);
            if (difficulty) q.set("difficulty", difficulty);
            q.set("sort", sort);
            q.set("page", String(page));
            q.set("limit", "12");
            const res = await fetch(`/api/quizzes/public?${q.toString()}`);
            const data = await res.json();
            if (data.success) {
                setQuizzes(data.data.quizzes);
                setTotal(data.data.pagination.total);
            } else {
                toast.error(data.error || "โหลดคลังไม่สำเร็จ");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsLoading(false);
        }
    }, [search, category, difficulty, sort, page]);

    useEffect(() => {
        const t = setTimeout(fetchLibrary, search ? 300 : 0);
        return () => clearTimeout(t);
    }, [fetchLibrary, search]);

    useEffect(() => {
        const q = new URLSearchParams();
        if (search) q.set("search", search);
        if (category) q.set("category", category);
        if (difficulty) q.set("difficulty", difficulty);
        if (sort !== "newest") q.set("sort", sort);
        if (page !== 1) q.set("page", String(page));
        router.replace(`/library?${q.toString()}`, { scroll: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, category, difficulty, sort, page]);

    return (
        <>
            <PageHeading
                overline="02 / PUBLIC LIBRARY"
                title="คลัง Quiz สาธารณะ"
                description="ค้นหา quiz ที่เพื่อนๆ เผยแพร่ เอาไปโฮสต์เล่น หรือก๊อปมาแก้เป็นของตัวเอง"
                actions={
                    <Link href="/quizzes" className="kq-btn kq-btn-paper">
                        Quiz ของฉัน
                    </Link>
                }
            />

            <div className="kq-card mb-7 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                    <label htmlFor="lib-search" className="kq-label">ค้นหา</label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            id="lib-search"
                            value={search}
                            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                            className="kq-input pl-9"
                            placeholder="ชื่อ quiz / คำอธิบาย..."
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="lib-category" className="kq-label">หมวด</label>
                    <input
                        id="lib-category"
                        value={category}
                        onChange={(e) => { setPage(1); setCategory(e.target.value); }}
                        className="kq-input sm:w-40"
                        placeholder="ทั้งหมด"
                    />
                </div>
                <div>
                    <label htmlFor="lib-difficulty" className="kq-label">ความยาก</label>
                    <select
                        id="lib-difficulty"
                        value={difficulty}
                        onChange={(e) => { setPage(1); setDifficulty(e.target.value); }}
                        className="kq-input sm:w-36"
                    >
                        <option value="">ทั้งหมด</option>
                        {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="lib-sort" className="kq-label">เรียง</label>
                    <select
                        id="lib-sort"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="kq-input sm:w-36"
                    >
                        {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72" />)}
                </div>
            ) : quizzes.length === 0 ? (
                <EmptyState
                    title="ยังไม่มี Quiz สาธารณะ"
                    description={total === 0 ? "เป็นคนแรกที่เผยแพร่ Quiz สู่คลังเลย!" : "ลองเปลี่ยนคำค้นหรือตัวกรอง"}
                    icon={<FileQuestion className="size-8 text-ink" />}
                    action={<Link href="/quizzes" className="kq-btn kq-btn-yellow">ไปหน้า Quiz ของฉัน</Link>}
                />
            ) : (
                <>
                    <p className="mb-4 text-sm font-medium text-muted-foreground">พบ {total} quiz</p>
                    <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                        {quizzes.map((quiz) => (
                            <article key={quiz.id} className="kq-card kq-card-hover flex min-w-0 flex-col">
                                <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
                                    <h2 className="truncate text-xl font-bold text-ink" title={quiz.title}>
                                        <Link href={`/library/${quiz.id}`} className="hover:underline">{quiz.title}</Link>
                                    </h2>
                                    <p className="line-clamp-2 flex-1 text-sm font-medium text-muted-foreground">
                                        {quiz.description || "ไม่มีคำอธิบาย"}
                                    </p>
                                    <p className="text-xs font-bold text-muted-foreground">โดย {quiz.author.name}</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="kq-badge kq-badge-cyan">{quiz._count.questions} ข้อ</span>
                                        <span className="kq-badge kq-badge-peach">เล่น {quiz.playCount} ครั้ง</span>
                                        {quiz.category ? <span className="kq-badge">{quiz.category}</span> : null}
                                        {quiz.difficulty ? <span className="kq-badge kq-badge-grape">{quiz.difficulty}</span> : null}
                                    </div>
                                    <div className="mt-1 grid grid-cols-2 gap-2 border-t-2 border-dashed border-line/30 pt-4">
                                        <Link href={`/library/${quiz.id}`} className="kq-btn kq-btn-sm kq-btn-yellow">
                                            <Play className="size-4" /> ดู / โฮสต์
                                        </Link>
                                        <Link href={`/library/${quiz.id}`} className="kq-btn kq-btn-sm kq-btn-paper">
                                            <Copy className="size-4" /> ก๊อป
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                    <div className="mt-7 flex items-center justify-center gap-2">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="kq-btn kq-btn-sm kq-btn-paper disabled:opacity-50"
                        >
                            ← ก่อนหน้า
                        </button>
                        <span className="kq-badge">หน้า {page}</span>
                        <button
                            type="button"
                            disabled={quizzes.length < 12}
                            onClick={() => setPage((p) => p + 1)}
                            className="kq-btn kq-btn-sm kq-btn-paper disabled:opacity-50"
                        >
                            ถัดไป →
                        </button>
                    </div>
                </>
            )}
        </>
    );
}

export default function LibraryPage() {
    return (
        <Suspense fallback={<Skeleton className="h-72" />}>
            <LibraryContent />
        </Suspense>
    );
}
