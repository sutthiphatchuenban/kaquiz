"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArcadeSprite } from "@/components/arcade-sprite";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    BarChart3,
    FileQuestion,
    LayoutDashboard,
    LogOut,
    Menu,
    Plus,
    Settings,
    ShieldCheck,
} from "lucide-react";

const NAV = [
    { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
    { href: "/quizzes", label: "Quiz ของฉัน", icon: FileQuestion },
    { href: "/reports", label: "รายงาน", icon: BarChart3 },
    { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

export function AppHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();

    const isActive = (href: string) => {
        const current = pathname ?? "";
        return current === href || current.startsWith(`${href}/`);
    };

    const handleLogout = async () => {
        await logout();
        router.push("/");
    };

    const initial = user?.name?.charAt(0).toUpperCase() ?? "?";

    return (
        <header className="kq-topbar">
            <div className="kq-shell-wide flex h-20 items-center justify-between gap-3">
                <div className="flex items-center gap-7">
                    <Link href="/dashboard" className="kq-brand">
                        <span className="kq-brand-mark">
                            <ArcadeSprite kind="bot" className="size-7" />
                        </span>
                        <span className="hidden sm:block">
                            <span className="kq-pixel-lg block text-[11px]">KAQUIZ</span>
                            <span className="kq-pixel block text-[6px] opacity-75">ARCADE</span>
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-6 lg:flex" aria-label="เมนูหลัก">
                        {NAV.map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                className={`kq-navlink ${isActive(href) ? "kq-navlink-active" : ""}`}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-2">
                    <ThemeToggle />

                    <Link
                        href="/quizzes/new"
                        className="kq-btn kq-btn-sm kq-btn-yellow hidden sm:inline-flex"
                    >
                        <Plus className="size-4" />
                        สร้าง Quiz
                    </Link>

                    {/* Compact nav for small screens */}
                    <div className="lg:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button type="button" className="kq-btn kq-btn-sm kq-btn-cyan !px-3" aria-label="เปิดเมนู">
                                    <Menu className="size-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="kq-pixel text-[8px] opacity-70">
                                    MENU
                                </DropdownMenuLabel>
                                {NAV.map(({ href, label, icon: Icon }) => (
                                    <DropdownMenuItem key={href} asChild>
                                        <Link href={href}>
                                            <Icon className="size-4" />
                                            {label}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/quizzes/new">
                                        <Plus className="size-4" />
                                        สร้าง Quiz ใหม่
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label="เมนูบัญชี"
                                className="grid size-11 place-items-center border-[3px] border-[#211543] bg-[var(--sunny)] font-bold text-[#211543] shadow-[3px_3px_0_#211543] transition-transform hover:-translate-x-[1px] hover:-translate-y-[1px]"
                            >
                                {initial}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                            <DropdownMenuLabel>
                                <span className="block truncate text-sm font-bold">
                                    {user?.name ?? "ผู้เล่น"}
                                </span>
                                <span className="block truncate text-xs font-medium text-muted-foreground">
                                    {user?.email ?? ""}
                                </span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {NAV.map(({ href, label, icon: Icon }) => (
                                <DropdownMenuItem key={href} asChild>
                                    <Link href={href}>
                                        <Icon className="size-4" />
                                        {label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                            {user?.isAdmin ? (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/admin">
                                            <ShieldCheck className="size-4" />
                                            ระบบผู้ดูแล
                                        </Link>
                                    </DropdownMenuItem>
                                </>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                                <LogOut className="size-4" />
                                ออกจากระบบ
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div className="kq-topbar-rule" />
        </header>
    );
}
