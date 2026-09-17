"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import {
    BarChart3,
    ChevronRight,
    FileQuestion,
    LogOut,
    PlayCircle,
    Plus,
    Trophy,
    Users,
} from "lucide-react";

export default function DashboardPage() {
    const router = useRouter();
    const { user, isLoading, isAuthenticated, checkAuth, logout } = useAuthStore();

    const [stats, setStats] = useState({
        quizCount: 0,
        gameCount: 0,
        totalPlayers: 0,
        averageScore: 0
    });
    const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) {
            const fetchDashboardData = async () => {
                try {
                    const res = await fetch("/api/dashboard");
                    const data = await res.json();
                    if (data.success) {
                        setStats({
                            quizCount: data.data.quizCount,
                            gameCount: data.data.gameCount,
                            totalPlayers: data.data.totalPlayers,
                            averageScore: data.data.averageScore
                        });
                        setRecentQuizzes(data.data.recentQuizzes);
                    }
                } catch (error) {
                    console.error("Failed to fetch dashboard data");
                }
            };
            fetchDashboardData();
        }
    }, [isAuthenticated]);

    const handleLogout = async () => {
        await logout();
        router.push("/");
    };

    if (isLoading) {
        return (
            <div>
                <div className="mb-8 space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-72" />
                    <Skeleton className="h-4 w-96 max-w-full" />
                </div>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    <Skeleton className="h-36" />
                    <Skeleton className="h-36" />
                    <Skeleton className="h-36" />
                    <Skeleton className="h-36" />
                </div>
                <div className="mt-8 grid gap-5 md:grid-cols-3">
                    <Skeleton className="h-56" />
                    <Skeleton className="h-56" />
                    <Skeleton className="h-56" />
                </div>
                <Skeleton className="mt-10 h-72" />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return null;
    }

    const statCards = [
        {
            n: "01",
            badge: "kq-badge kq-badge-cyan",
            icon: FileQuestion,
            value: stats.quizCount,
            label: "Quiz ทั้งหมด",
            overline: "TOTAL QUIZZES",
        },
        {
            n: "02",
            badge: "kq-badge kq-badge-mint",
            icon: PlayCircle,
            value: stats.gameCount,
            label: "เกมที่เล่น",
            overline: "GAMES PLAYED",
        },
        {
            n: "03",
            badge: "kq-badge kq-badge-peach",
            icon: Users,
            value: stats.totalPlayers,
            label: "ผู้เล่นทั้งหมด",
            overline: "TOTAL PLAYERS",
        },
        {
            n: "04",
            badge: "kq-badge kq-badge-pink",
            icon: Trophy,
            value: stats.averageScore,
            label: "คะแนนเฉลี่ย",
            overline: "AVG SCORE",
        },
    ];

    const quickActions = [
        {
            href: "/quizzes/new",
            n: "01",
            icon: Plus,
            color: "var(--candy)",
            badge: "kq-badge kq-badge-paper",
            title: "สร้าง Quiz ใหม่",
            desc: "เริ่มต้นสร้าง Quiz ของคุณเลย",
        },
        {
            href: "/quizzes",
            n: "02",
            icon: FileQuestion,
            color: "var(--electric)",
            badge: "kq-badge kq-badge-grape",
            title: "Quiz ของฉัน",
            desc: "จัดการ Quiz ทั้งหมดของคุณ",
        },
        {
            href: "/reports",
            n: "03",
            icon: BarChart3,
            color: "var(--mint)",
            badge: "kq-badge kq-badge-grape",
            title: "รายงาน",
            desc: "ดูสถิติและผลการเล่น",
        },
    ];

    return (
        <div>
            {/* ============ WELCOME ============ */}
            <div className="relative">
                <PageHeading
                    overline="PLAYER DASHBOARD"
                    title={`สวัสดี, ${user.name}! 👋`}
                    description="ยินดีต้อนรับกลับมา พร้อมสร้าง Quiz สุดมันส์หรือยัง?"
                />
                <span className="kq-sticker absolute -top-3 right-0 hidden rotate-[8deg] px-3 py-2 text-center lg:grid">
                    PLAYER
                    <br />
                    01 ✦
                </span>
            </div>

            {/* ============ STATS — 4 UP ============ */}
            <section className="mt-2">
                <div className="mb-4 flex items-center gap-3">
                    <span className="kq-badge kq-badge-grape">STATS</span>
                    <h2 className="text-base font-bold text-ink">สถิติของคุณ</h2>
                    <hr className="kq-divider flex-1" />
                </div>

                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {statCards.map(({ n, badge, icon: Icon, value, label, overline }) => (
                        <article key={n} className="kq-card kq-card-hover">
                            <div className="kq-art flex items-center gap-3 p-4">
                                <span className={badge}>{n}</span>
                                <span className="kq-stat-icon">
                                    <Icon className="size-5" strokeWidth={2.5} />
                                </span>
                                <span className="kq-stat-value ml-auto">{value}</span>
                            </div>
                            <div className="p-4">
                                <p className="text-sm font-bold text-ink">{label}</p>
                                <p className="kq-pixel mt-1 text-[7px] text-muted-foreground">
                                    {overline}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            {/* ============ QUICK ACTIONS ============ */}
            <section className="mt-10">
                <div className="mb-4 flex items-center gap-3">
                    <span className="kq-badge">QUICK START</span>
                    <h2 className="text-base font-bold text-ink">เริ่มเล่นได้เลย</h2>
                    <hr className="kq-divider flex-1" />
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                    {quickActions.map(({ href, n, icon: Icon, color, badge, title, desc }) => (
                        <Link key={href} href={href} className="kq-card kq-card-hover flex flex-col">
                            <div
                                className="kq-art grid h-28 place-items-center"
                                style={{ backgroundColor: color }}
                            >
                                <span className={`${badge} absolute left-3 top-3`}>{n}</span>
                                <span className="grid size-16 rotate-[4deg] place-items-center border-4 border-dashed border-white/75">
                                    <Icon className="size-8 text-[#211543]" strokeWidth={2.4} />
                                </span>
                            </div>

                            <div className="flex flex-1 flex-col gap-2 p-5">
                                <h3 className="text-lg font-bold text-ink">{title}</h3>
                                <p className="flex-1 text-sm font-medium text-muted-foreground">
                                    {desc}
                                </p>
                                <span className="kq-pixel mt-1 flex items-center gap-1 text-[8px] text-[var(--candy)]">
                                    GO!
                                    <ChevronRight className="size-3.5" strokeWidth={3} />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ============ RECENT QUIZZES ============ */}
            <section className="mt-10">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span className="kq-badge kq-badge-grape">RECENT</span>
                    <h2 className="text-base font-bold text-ink">Quiz ล่าสุด</h2>
                    <hr className="kq-divider flex-1" />
                    <Link href="/quizzes" className="kq-btn kq-btn-sm kq-btn-paper">
                        ดูทั้งหมด
                        <ChevronRight className="size-4" />
                    </Link>
                </div>

                {recentQuizzes.length === 0 ? (
                    <EmptyState
                        title="ยังไม่มี Quiz"
                        description="เริ่มต้นสร้าง Quiz แรกของคุณเลย!"
                        action={
                            <Link href="/quizzes/new" className="kq-btn kq-btn-yellow">
                                <Plus className="size-4" />
                                สร้าง Quiz
                            </Link>
                        }
                    />
                ) : (
                    <div className="space-y-4">
                        {recentQuizzes.map((quiz) => (
                            <article
                                key={quiz.id}
                                className="kq-card kq-card-hover flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-center gap-4">
                                    <span className="grid size-11 flex-none place-items-center border-[3px] border-line bg-[var(--electric)] text-[#211543] shadow-hard-sm">
                                        <FileQuestion className="size-5" strokeWidth={2.5} />
                                    </span>
                                    <div className="min-w-0">
                                        <h3 className="truncate text-base font-bold text-ink">
                                            {quiz.title}
                                        </h3>
                                        <p className="mt-0.5 truncate text-sm font-medium text-muted-foreground">
                                            {quiz.description || "ไม่มีคำอธิบาย"} •{" "}
                                            {quiz._count?.questions || 0} คำถาม
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="kq-badge kq-badge-mint">
                                        {quiz._count?.questions || 0} Q
                                    </span>
                                    <Link
                                        href={`/quizzes/${quiz.id}/host`}
                                        className="kq-btn kq-btn-sm kq-btn-yellow"
                                    >
                                        <PlayCircle className="size-4" />
                                        เล่น
                                    </Link>
                                    <Link
                                        href={`/quizzes/${quiz.id}/edit`}
                                        className="kq-btn kq-btn-sm kq-btn-cyan"
                                    >
                                        แก้ไข
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {/* ============ SESSION ============ */}
            <div className="mt-10 flex justify-end">
                <button
                    type="button"
                    onClick={handleLogout}
                    className="kq-btn kq-btn-sm kq-btn-paper"
                >
                    <LogOut className="size-4" />
                    ออกจากระบบ
                </button>
            </div>
        </div>
    );
}
