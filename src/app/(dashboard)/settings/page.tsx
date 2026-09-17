"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/page-heading";
import {
    ArrowLeft,
    LogOut,
    Mail,
    Palette,
    Settings,
    Trophy,
    User,
    Zap,
} from "lucide-react";
import { toast } from "sonner";

const ROW_COLORS = [
    "var(--electric)",
    "var(--mint)",
    "var(--peach)",
    "var(--sunny)",
];

export default function SettingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, checkAuth, logout } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    const handleLogout = async () => {
        await logout();
        toast.success("ออกจากระบบสำเร็จ");
        router.push("/");
    };

    if (authLoading) {
        return (
            <div className="kq-shell-tight">
                <Skeleton className="h-9 w-52" />
                <Skeleton className="mt-6 h-4 w-32" />
                <Skeleton className="mt-3 h-10 w-64" />
                <Skeleton className="mt-8 h-40" />
                <Skeleton className="mt-6 h-64" />
                <Skeleton className="mt-6 h-28" />
            </div>
        );
    }

    if (!user) return null;

    const initial = user.name.charAt(0).toUpperCase();

    const accountRows = [
        { icon: User, latin: "NAME", label: "ชื่อที่แสดง", value: user.name },
        { icon: Mail, latin: "EMAIL", label: "อีเมล", value: user.email },
        { icon: Trophy, latin: "PLAN", label: "แพ็กเกจ", value: "FREE PLAYER" },
        { icon: Zap, latin: "STATUS", label: "สถานะ", value: "พร้อมเล่น" },
    ];

    return (
        <div className="kq-shell-tight">
            <Link href="/dashboard" className="kq-btn kq-btn-sm kq-btn-paper">
                <ArrowLeft className="size-4" />
                กลับไปหน้า Dashboard
            </Link>

            <div className="mt-6">
                <PageHeading
                    overline="ACCOUNT / ตั้งค่า"
                    title="ตั้งค่า"
                    description="จัดการบัญชีและการตั้งค่าของคุณ"
                />
            </div>

            {/* ============ PROFILE ============ */}
            <section className="kq-card relative">
                <span className="kq-sticker absolute -top-4 right-5 z-10 rotate-[7deg] px-3 py-2 text-center">
                    PLAYER
                    <br />
                    01 ✦
                </span>

                <div className="kq-art flex items-center gap-4 p-5">
                    <span className="grid size-16 flex-none place-items-center border-[3px] border-[#211543] bg-[var(--sunny)] text-2xl font-extrabold text-[#211543] shadow-[4px_4px_0_#211543]">
                        {initial}
                    </span>
                    <div className="min-w-0">
                        <p className="kq-pixel text-[8px] text-[var(--sunny)]">PROFILE</p>
                        <h2 className="truncate text-xl font-bold text-[var(--on-arcade)]">
                            {user.name}
                        </h2>
                        <p className="truncate text-sm font-medium text-[#e9dcff]">
                            {user.email}
                        </p>
                    </div>
                </div>
            </section>

            {/* ============ ACCOUNT DETAILS ============ */}
            <section className="kq-card mt-6">
                <div className="flex items-center gap-3 p-5">
                    <span className="kq-stat-icon">
                        <Settings className="size-5" strokeWidth={2.5} />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-ink">รายละเอียดบัญชี</h2>
                        <p className="kq-pixel mt-0.5 text-[7px] text-muted-foreground">
                            ACCOUNT DETAILS
                        </p>
                    </div>
                </div>

                <hr className="kq-divider mx-5" />

                <div>
                    {accountRows.map(({ icon: Icon, latin, label, value }, i) => (
                        <div key={latin}>
                            {i > 0 ? <hr className="kq-divider mx-5" /> : null}
                            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                                <span className="flex min-w-0 items-center gap-3">
                                    <span
                                        className="grid size-10 flex-none place-items-center border-[3px] border-line text-[#211543] shadow-hard-sm"
                                        style={{ backgroundColor: ROW_COLORS[i % ROW_COLORS.length] }}
                                    >
                                        <Icon className="size-4" strokeWidth={2.5} />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="kq-pixel block text-[7px] text-muted-foreground">
                                            {latin}
                                        </span>
                                        <span className="block truncate text-sm font-bold text-ink">
                                            {label}
                                        </span>
                                    </span>
                                </span>
                                <span className="w-full truncate text-sm font-semibold text-muted-foreground sm:w-auto sm:text-right">
                                    {value}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ============ APPEARANCE ============ */}
            <section className="kq-card mt-6">
                <div className="flex items-start gap-3 p-5">
                    <span className="grid size-11 flex-none place-items-center border-[3px] border-line bg-[var(--candy)] text-[#211543] shadow-hard-sm">
                        <Palette className="size-5" strokeWidth={2.5} />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-ink">การแสดงผล</h2>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">
                            (ธีมสีม่วง KaQuiz เป็นค่าเริ่มต้น)
                        </p>
                    </div>
                </div>
            </section>

            {/* ============ LOGOUT ============ */}
            <div className="mt-8">
                <button
                    type="button"
                    onClick={handleLogout}
                    className="kq-btn kq-btn-danger kq-btn-block"
                >
                    <LogOut className="size-4" />
                    ออกจากระบบ
                </button>
            </div>
        </div>
    );
}
