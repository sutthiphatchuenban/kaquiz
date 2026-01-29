import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "เข้าร่วมเกม | KaQuiz",
    description: "เข้าร่วมเกม Quiz แบบ Real-time",
};

export default function GameLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
