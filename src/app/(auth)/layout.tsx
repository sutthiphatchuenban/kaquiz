import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "เข้าสู่ระบบ | KaQuiz",
    description: "เข้าสู่ระบบเพื่อสร้างและเล่น Quiz",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
