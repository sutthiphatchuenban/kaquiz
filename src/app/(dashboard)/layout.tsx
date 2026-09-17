import type { Metadata } from "next";

import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
    title: "Dashboard | KaQuiz",
    description: "จัดการ Quiz และดูสถิติของคุณ",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-dvh flex-col">
            <AppHeader />
            <main className="flex-1 bg-[var(--cream)]">
                <div className="kq-shell-wide py-8">{children}</div>
            </main>
            <SiteFooter />
        </div>
    );
}
