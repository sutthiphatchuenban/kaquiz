import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArcadeSprite } from "@/components/arcade-sprite";

export const metadata: Metadata = {
    title: "เข้าสู่ระบบ | KaQuiz",
    description: "เข้าสู่ระบบเพื่อสร้างและเล่น Quiz",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-dvh flex-col">
            <header className="kq-shell flex items-center justify-between gap-3 py-4">
                <Link href="/" className="kq-brand">
                    <span className="kq-brand-mark size-10">
                        <ArcadeSprite kind="bot" className="size-6" />
                    </span>
                    <span className="block">
                        <span className="kq-pixel-lg block text-[10px]">KAQUIZ</span>
                        <span className="kq-pixel block text-[6px] opacity-75">ARCADE</span>
                    </span>
                </Link>

                <div className="flex items-center gap-2">
                    <Link href="/" className="kq-btn kq-btn-sm kq-btn-ghost">
                        <ArrowLeft className="size-4" />
                        กลับหน้าแรก
                    </Link>
                    <ThemeToggle />
                </div>
            </header>

            {/*
             * Safe centering: `my-auto` on the child centres it while there is
             * room, and collapses to 0 when the card is taller than the screen
             * so the top stays reachable and the area scrolls normally.
             */}
            <main className="relative flex min-h-0 flex-1 justify-center overflow-y-auto px-4 py-6">
                <span
                    aria-hidden
                    className="kq-pixel animate-twinkle pointer-events-none absolute left-[12%] top-8 hidden text-2xl text-[var(--sunny)] lg:block"
                >
                    ✦
                </span>
                <span
                    aria-hidden
                    className="kq-pixel animate-twinkle pointer-events-none absolute right-[13%] top-1/2 hidden text-xl text-[var(--electric)] lg:block"
                >
                    ✳
                </span>

                <div className="mx-auto my-auto w-full max-w-md">{children}</div>
            </main>
        </div>
    );
}
