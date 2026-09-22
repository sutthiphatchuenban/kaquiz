"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Activity,
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    Clock3,
    FileQuestion,
    Gamepad2,
    Loader2,
    RefreshCw,
    ShieldCheck,
    Square,
    Trash2,
    UserRound,
    Users,
} from "lucide-react";

type AdminTab = "overview" | "users" | "quizzes" | "sessions";
type AdminAction = "DELETE_USER" | "DELETE_QUIZ" | "END_SESSION";

interface AdminUser {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    _count: { quizzes: number; gameSessions: number };
}

interface AdminQuiz {
    id: string;
    title: string;
    createdAt: string;
    user: { name: string; email: string };
    _count: { questions: number; gameSessions: number };
}

interface AdminSession {
    id: string;
    pin: string;
    status: string;
    createdAt: string;
    endedAt: string | null;
    host: { name: string; email: string };
    quiz: { title: string };
    _count: { players: number };
}

interface OverviewData {
    stats: {
        users: number;
        quizzes: number;
        sessions: number;
        players: number;
        activeSessions: number;
    };
    users: AdminUser[];
    quizzes: AdminQuiz[];
    sessions: AdminSession[];
}

const TABS: Array<{ id: AdminTab; label: string; icon: typeof BarChart3 }> = [
    { id: "overview", label: "ภาพรวม", icon: BarChart3 },
    { id: "users", label: "ผู้ใช้", icon: Users },
    { id: "quizzes", label: "Quiz", icon: FileQuestion },
    { id: "sessions", label: "เซสชัน", icon: Gamepad2 },
];

const DATE_FORMATTER = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
});

function formatDate(value: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : DATE_FORMATTER.format(date);
}

function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
        LOBBY: "รอผู้เล่น",
        PLAYING: "กำลังเล่น",
        QUESTION: "กำลังตอบคำถาม",
        SHOWING_ANSWER: "กำลังเฉลย",
        LEADERBOARD: "ตารางคะแนน",
        FINISHED: "จบแล้ว",
    };
    return labels[status.toUpperCase()] || status;
}

function isActiveSession(status: string) {
    return status.toUpperCase() !== "FINISHED";
}

export default function AdminPage() {
    const router = useRouter();
    const { user, checkAuth } = useAuthStore();
    const [authChecked, setAuthChecked] = useState(false);
    const [activeTab, setActiveTab] = useState<AdminTab>("overview");
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionTarget, setActionTarget] = useState<string | null>(null);
    const isAdmin = Boolean(user && "isAdmin" in user && user.isAdmin);

    useEffect(() => {
        let mounted = true;
        void checkAuth().finally(() => {
            if (mounted) setAuthChecked(true);
        });
        return () => {
            mounted = false;
        };
    }, [checkAuth]);

    useEffect(() => {
        if (!authChecked) return;
        if (!user) {
            router.replace("/login");
        } else if (!isAdmin) {
            router.replace("/dashboard");
        }
    }, [authChecked, isAdmin, router, user]);

    const fetchOverview = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/admin/overview", { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok || !payload.success || !payload.data) {
                throw new Error(payload.error || "ไม่สามารถโหลดข้อมูลแอดมินได้");
            }
            setOverview(payload.data as OverviewData);
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authChecked && isAdmin) void fetchOverview();
    }, [authChecked, fetchOverview, isAdmin]);

    const runAction = async (action: AdminAction, targetId: string, message: string, force = false) => {
        if (!force && !window.confirm(message)) return;

        setActionTarget(targetId);
        setError(null);
        try {
            const response = await fetch("/api/admin/actions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, targetId, ...(force ? { force: true } : {}) }),
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) {
                // Quiz มีประวัติ — ให้ทางเลือก wipe แบบชัดๆ แทน error เปล่าๆ
                if (!force && action === "DELETE_QUIZ" && payload.message === "HAS_HISTORY") {
                    const retry = window.confirm(
                        `${payload.error}\n\nกด OK เพื่อลบพร้อมประวัติทั้งหมด (ย้อนกลับไม่ได้)`
                    );
                    if (retry) {
                        await runAction(action, targetId, message, true);
                        return;
                    }
                }
                throw new Error(payload.error || "ดำเนินการไม่สำเร็จ");
            }
            await fetchOverview();
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setActionTarget(null);
        }
    };

    if (!authChecked || (authChecked && (!user || !isAdmin))) {
        return (
            <div className="space-y-6" aria-label="กำลังตรวจสอบสิทธิ์">
                <Skeleton className="h-24 w-full" />
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
                    {[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-32" />)}
                </div>
                <Skeleton className="h-80 w-full" />
            </div>
        );
    }

    const statCards = overview ? [
        { label: "ผู้ใช้", value: overview.stats.users, icon: Users, color: "var(--electric)", badge: "PLAYERS" },
        { label: "Quiz ทั้งหมด", value: overview.stats.quizzes, icon: FileQuestion, color: "var(--sunny)", badge: "QUIZZES" },
        { label: "เซสชัน", value: overview.stats.sessions, icon: Gamepad2, color: "var(--peach)", badge: "SESSIONS" },
        { label: "ผู้เล่นสะสม", value: overview.stats.players, icon: UserRound, color: "var(--mint)", badge: "TOTAL PLAYS" },
        { label: "ห้องที่ยังไม่จบ", value: overview.stats.activeSessions, icon: Activity, color: "var(--candy)", badge: "OPEN ROOMS" },
    ] : [];

    return (
        <div>
            <header className="relative mb-8 overflow-hidden border-[3px] border-line bg-[var(--arcade)] p-5 text-[var(--on-arcade)] shadow-hard sm:p-7">
                <div className="absolute -right-5 -top-8 size-32 rotate-12 border-[3px] border-dashed border-white/30" />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <span className="kq-badge kq-badge-yellow mb-4 inline-flex items-center gap-2">
                            <ShieldCheck className="size-3.5" /> ADMIN MODE
                        </span>
                        <h1 className="text-3xl font-black sm:text-4xl">ศูนย์ควบคุม KaQuiz</h1>
                        <p className="mt-2 max-w-2xl text-sm font-medium text-white/80 sm:text-base">
                            ดูภาพรวมและจัดการผู้ใช้ Quiz และเซสชันทั้งหมดในระบบ
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void fetchOverview()}
                        disabled={isLoading}
                        className="kq-btn kq-btn-yellow self-start sm:self-auto"
                    >
                        <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                        รีเฟรชข้อมูล
                    </button>
                </div>
            </header>

            {error && (
                <div role="alert" className="mb-6 flex flex-col gap-3 border-[3px] border-line bg-[var(--candy)] p-4 text-[#211543] shadow-hard-sm sm:flex-row sm:items-center">
                    <AlertTriangle className="size-5 flex-none" />
                    <p className="flex-1 font-bold">{error}</p>
                    <button type="button" onClick={() => void fetchOverview()} className="kq-btn kq-btn-sm kq-btn-paper">
                        ลองอีกครั้ง
                    </button>
                </div>
            )}

            <nav className="mb-7 flex gap-2 overflow-x-auto border-b-[3px] border-line pb-3" aria-label="เมนูจัดการระบบ">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setActiveTab(id)}
                        aria-current={activeTab === id ? "page" : undefined}
                        className={`kq-btn kq-btn-sm flex-none ${activeTab === id ? "kq-btn-yellow" : "kq-btn-paper"}`}
                    >
                        <Icon className="size-4" /> {label}
                    </button>
                ))}
            </nav>

            {isLoading && !overview ? (
                <div className="space-y-8">
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
                        {[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-32" />)}
                    </div>
                    <Skeleton className="h-80 w-full" />
                </div>
            ) : overview && (
                <>
                    {activeTab === "overview" && (
                        <div className="space-y-9">
                            <section>
                                <div className="mb-4 flex items-center gap-3">
                                    <span className="kq-badge kq-badge-grape">SYSTEM STATS</span>
                                    <h2 className="font-bold text-ink">ภาพรวมระบบ</h2>
                                    <hr className="kq-divider flex-1" />
                                </div>
                                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
                                    {statCards.map(({ label, value, icon: Icon, color, badge }) => (
                                        <article key={label} className="kq-card overflow-hidden">
                                            <div className="flex items-center justify-between border-b-[3px] border-line p-4" style={{ backgroundColor: color }}>
                                                <Icon className="size-6 text-[#211543]" strokeWidth={2.5} />
                                                <span className="kq-pixel text-2xl text-[#211543]">{value.toLocaleString("th-TH")}</span>
                                            </div>
                                            <div className="p-4">
                                                <p className="font-bold text-ink">{label}</p>
                                                <p className="kq-pixel mt-1 text-[7px] text-muted-foreground">{badge}</p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>

                            <section className="grid gap-6 lg:grid-cols-3">
                                <SummaryPanel title="ผู้ใช้ล่าสุด" icon={Users} onViewAll={() => setActiveTab("users")}>
                                    {overview.users.slice(0, 5).map((item) => (
                                        <SummaryRow key={item.id} title={item.name} detail={item.email} meta={formatDate(item.createdAt)} />
                                    ))}
                                </SummaryPanel>
                                <SummaryPanel title="Quiz ล่าสุด" icon={FileQuestion} onViewAll={() => setActiveTab("quizzes")}>
                                    {overview.quizzes.slice(0, 5).map((item) => (
                                        <SummaryRow key={item.id} title={item.title} detail={`โดย ${item.user.name}`} meta={`${item._count.questions} คำถาม`} />
                                    ))}
                                </SummaryPanel>
                                <SummaryPanel title="เซสชันล่าสุด" icon={Gamepad2} onViewAll={() => setActiveTab("sessions")}>
                                    {overview.sessions.slice(0, 5).map((item) => (
                                        <SummaryRow key={item.id} title={item.quiz.title} detail={`PIN ${item.pin}`} meta={`${item._count.players} คน`} />
                                    ))}
                                </SummaryPanel>
                            </section>
                        </div>
                    )}

                    {activeTab === "users" && (
                        <DataSection badge="USER DIRECTORY" title={`ผู้ใช้ทั้งหมด (${overview.users.length})`}>
                            {overview.users.length === 0 ? <EmptyMessage text="ยังไม่มีผู้ใช้ในระบบ" /> : (
                                <div className="grid gap-4 lg:grid-cols-2">
                                    {overview.users.map((item) => (
                                        <article key={item.id} className="kq-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                                            <span className="grid size-12 flex-none place-items-center border-[3px] border-line bg-[var(--electric)] shadow-hard-sm">
                                                <UserRound className="size-6 text-[#211543]" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="truncate font-bold text-ink">{item.name}</h3>
                                                <p className="truncate text-sm text-muted-foreground">{item.email}</p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <span className="kq-badge kq-badge-cyan">{item._count.quizzes} Quiz</span>
                                                    <span className="kq-badge kq-badge-peach">{item._count.gameSessions} เกม</span>
                                                    <span className="text-xs font-medium text-muted-foreground">สมัคร {formatDate(item.createdAt)}</span>
                                                </div>
                                            </div>
                                            <ActionButton
                                                busy={actionTarget === item.id}
                                                label="ลบผู้ใช้"
                                                onClick={() => void runAction("DELETE_USER", item.id, `ยืนยันลบผู้ใช้ “${item.name}”? ข้อมูลที่เกี่ยวข้องอาจถูกลบไปด้วย`)}
                                            />
                                        </article>
                                    ))}
                                </div>
                            )}
                        </DataSection>
                    )}

                    {activeTab === "quizzes" && (
                        <DataSection badge="QUIZ CONTROL" title={`Quiz ทั้งหมด (${overview.quizzes.length})`}>
                            {overview.quizzes.length === 0 ? <EmptyMessage text="ยังไม่มี Quiz ในระบบ" /> : (
                                <div className="grid gap-4 lg:grid-cols-2">
                                    {overview.quizzes.map((item) => (
                                        <article key={item.id} className="kq-card p-5">
                                            <div className="flex items-start gap-4">
                                                <span className="grid size-12 flex-none place-items-center border-[3px] border-line bg-[var(--sunny)] shadow-hard-sm">
                                                    <FileQuestion className="size-6 text-[#211543]" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="truncate font-bold text-ink">{item.title}</h3>
                                                    </div>
                                                    <p className="mt-1 truncate text-sm text-muted-foreground">{item.user.name} · {item.user.email}</p>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-dashed border-line/30 pt-4">
                                                <span className="kq-badge kq-badge-cyan">{item._count.questions} คำถาม</span>
                                                <span className="kq-badge kq-badge-peach">{item._count.gameSessions} เกม</span>
                                                <span className="mr-auto text-xs font-medium text-muted-foreground">{formatDate(item.createdAt)}</span>
                                                <ActionButton
                                                    busy={actionTarget === item.id}
                                                    label="ลบ Quiz"
                                                    onClick={() => void runAction("DELETE_QUIZ", item.id, `ยืนยันลบ Quiz “${item.title}”? การดำเนินการนี้ย้อนกลับไม่ได้`)}
                                                />
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </DataSection>
                    )}

                    {activeTab === "sessions" && (
                        <DataSection badge="GAME MONITOR" title={`เซสชันทั้งหมด (${overview.sessions.length})`}>
                            {overview.sessions.length === 0 ? <EmptyMessage text="ยังไม่มีเซสชันในระบบ" /> : (
                                <div className="space-y-4">
                                    {overview.sessions.map((item) => {
                                        const active = isActiveSession(item.status);
                                        return (
                                            <article key={item.id} className="kq-card flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                                                <div className={`grid size-14 flex-none place-items-center border-[3px] border-line shadow-hard-sm ${active ? "bg-[var(--candy)]" : "bg-[var(--mint)]"}`}>
                                                    {active ? <Activity className="size-6 text-[#211543]" /> : <CheckCircle2 className="size-6 text-[#211543]" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="truncate font-bold text-ink">{item.quiz.title}</h3>
                                                        <span className={`kq-badge ${active ? "kq-badge-pink" : "kq-badge-mint"}`}>{getStatusLabel(item.status)}</span>
                                                    </div>
                                                    <p className="mt-1 text-sm text-muted-foreground">โฮสต์: {item.host.name} · {item.host.email}</p>
                                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground">
                                                        <span className="kq-pixel text-[9px] text-ink">PIN {item.pin}</span>
                                                        <span>{item._count.players} ผู้เล่น</span>
                                                        <span>เริ่ม {formatDate(item.createdAt)}</span>
                                                        {item.endedAt && <span>จบ {formatDate(item.endedAt)}</span>}
                                                    </div>
                                                </div>
                                                {active && (
                                                    <button
                                                        type="button"
                                                        disabled={actionTarget === item.id}
                                                        onClick={() => void runAction("END_SESSION", item.id, `ยืนยันจบเซสชัน PIN ${item.pin}? ผู้เล่นจะไม่สามารถเล่นต่อได้`)}
                                                        className="kq-btn kq-btn-sm kq-btn-danger"
                                                    >
                                                        {actionTarget === item.id ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />}
                                                        จบเซสชัน
                                                    </button>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </DataSection>
                    )}
                </>
            )}
        </div>
    );
}

function DataSection({ badge, title, children }: { badge: string; title: string; children: React.ReactNode }) {
    return (
        <section>
            <div className="mb-5 flex items-center gap-3">
                <span className="kq-badge kq-badge-grape">{badge}</span>
                <h2 className="font-bold text-ink">{title}</h2>
                <hr className="kq-divider flex-1" />
            </div>
            {children}
        </section>
    );
}

function SummaryPanel({ title, icon: Icon, onViewAll, children }: { title: string; icon: typeof Users; onViewAll: () => void; children: React.ReactNode }) {
    return (
        <article className="kq-card overflow-hidden">
            <div className="flex items-center gap-3 border-b-[3px] border-line bg-[var(--paper)] p-4">
                <Icon className="size-5" />
                <h3 className="flex-1 font-bold text-ink">{title}</h3>
                <button type="button" onClick={onViewAll} className="kq-pixel text-[8px] text-[var(--arcade)] hover:underline">ดูทั้งหมด</button>
            </div>
            <div className="divide-y-2 divide-dashed divide-line/20">
                {children || <EmptyMessage text="ยังไม่มีข้อมูล" />}
            </div>
        </article>
    );
}

function SummaryRow({ title, detail, meta }: { title: string; detail: string; meta: string }) {
    return (
        <div className="flex items-center gap-3 p-4">
            <Clock3 className="size-4 flex-none text-muted-foreground" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{title}</p>
                <p className="truncate text-xs text-muted-foreground">{detail}</p>
            </div>
            <span className="text-right text-xs font-bold text-muted-foreground">{meta}</span>
        </div>
    );
}

function ActionButton({ busy, label, onClick }: { busy: boolean; label: string; onClick: () => void }) {
    return (
        <button type="button" disabled={busy} onClick={onClick} className="kq-btn kq-btn-sm kq-btn-danger flex-none">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {label}
        </button>
    );
}

function EmptyMessage({ text }: { text: string }) {
    return (
        <div className="grid min-h-36 place-items-center border-[3px] border-dashed border-line/40 bg-paper p-6 text-center">
            <div>
                <Gamepad2 className="mx-auto mb-2 size-7 text-muted-foreground" />
                <p className="font-bold text-muted-foreground">{text}</p>
            </div>
        </div>
    );
}
