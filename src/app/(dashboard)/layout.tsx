import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Dashboard | KaQuiz",
    description: "จัดการ Quiz และดูสถิติของคุณ",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
