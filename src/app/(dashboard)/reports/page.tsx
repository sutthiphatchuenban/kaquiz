"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import {
    BarChart3,
    Users,
    FileQuestion,
    Trophy,
    Clock
} from "lucide-react";
import { toast } from "sonner";

interface GameSession {
    id: string;
    pin: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    createdAt: string;
    quiz: {
        title: string;
    };
    _count: {
        players: number;
    };
}

export default function ReportsPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();
    const [sessions, setSessions] = useState<GameSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
            fetchReports();
        }
    }, [isAuthenticated]);

    const fetchReports = async () => {
        try {
            const res = await fetch("/api/reports");
            const data = await res.json();
            if (data.success) {
                setSessions(data.data);
            }
        } catch {
            toast.error("ไม่สามารถโหลดรายงานได้");
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "FINISHED":
                return <span className="kq-badge kq-badge-mint">เสร็จสิ้น</span>;
            case "LOBBY":
                return <span className="kq-badge kq-badge-cyan">รอผู้เล่น</span>;
            case "PLAYING":
            case "QUESTION":
                return <span className="kq-badge kq-badge-peach">กำลังเล่น</span>;
            default:
                return <span className="kq-badge kq-badge-paper">{status}</span>;
        }
    };

    const summaryStats = [
        {
            icon: BarChart3,
            value: sessions.length,
            label: "เกมทั้งหมด",
            tint: "bg-[var(--sunny)]",
        },
        {
            icon: Users,
            value: sessions.reduce((sum, s) => sum + s._count.players, 0),
            label: "ผู้เล่นรวม",
            tint: "bg-[var(--electric)]",
        },
        {
            icon: Trophy,
            value: sessions.filter((s) => s.status === "FINISHED").length,
            label: "เกมที่จบแล้ว",
            tint: "bg-[var(--candy)]",
        },
    ];

    if (authLoading) {
        return (
            <div>
                <Skeleton className="h-10 w-56" />
                <div className="mt-8 space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <PageHeading
                overline="03 / GAME HISTORY"
                title="รายงาน"
                description="ดูประวัติการเล่นและสถิติของทุกเกมที่คุณจัด"
            />

            <div className="grid gap-5 sm:grid-cols-3">
                {summaryStats.map(({ icon: Icon, value, label, tint }) => (
                    <div key={label} className="kq-card flex items-center gap-4 bg-arcade p-5">
                        <span className={`kq-stat-icon ${tint}`}>
                            <Icon className="size-5" strokeWidth={2.5} />
                        </span>
                        <span className="min-w-0">
                            <span className="kq-stat-value block text-2xl">{value}</span>
                            <span className="kq-stat-label block truncate">{label}</span>
                        </span>
                    </div>
                ))}
            </div>

            {isLoading ? (
                <div className="mt-8 space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <div className="mt-8">
                    <EmptyState
                        title="ยังไม่มีรายงาน"
                        description="เริ่มจัดเกมเพื่อดูรายงานการเล่น"
                        icon={<BarChart3 className="size-8 text-ink" />}
                        action={
                            <Link href="/quizzes" className="kq-btn kq-btn-yellow">
                                ไปที่ Quiz ของฉัน
                            </Link>
                        }
                    />
                </div>
            ) : (
                <>
                    <div className="mb-4 mt-10 flex items-center gap-3">
                        <h2 className="kq-overline whitespace-nowrap">SESSION LOG</h2>
                        <hr className="kq-divider flex-1" />
                    </div>

                    <div className="grid gap-4">
                        {sessions.map((session) => (
                            <article
                                key={session.id}
                                className="kq-card kq-card-hover flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-start gap-4">
                                    <span className="kq-stat-icon shrink-0 bg-grape">
                                        <FileQuestion
                                            className="size-5 text-[var(--on-arcade)]"
                                            strokeWidth={2.5}
                                        />
                                    </span>
                                    <div className="min-w-0">
                                        <h3 className="truncate text-lg font-bold text-ink">
                                            {session.quiz.title}
                                        </h3>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Clock className="size-3.5" />
                                                {formatDate(session.createdAt)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="size-3.5" />
                                                {session._count.players} ผู้เล่น
                                            </span>
                                            <span className="kq-badge kq-badge-paper">
                                                PIN: {session.pin}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0">
                                    {getStatusBadge(session.status)}
                                </div>
                            </article>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}
