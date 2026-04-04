import type { Metadata } from "next";
import { Prompt, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const prompt = Prompt({
  variable: "--font-prompt",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KaQuiz - สร้าง Quiz ออนไลน์ แบบ Real-time",
  description: "สร้าง Quiz แบบ Interactive, เชิญเพื่อนมาเล่น และแข่งขันกันแบบ Real-time ทำให้การเรียนรู้สนุกยิ่งขึ้น!",
  keywords: ["quiz", "kahoot", "education", "realtime", "game", "learning"],
  authors: [{ name: "KaQuiz Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${prompt.variable} ${inter.variable} antialiased font-prompt`}
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

