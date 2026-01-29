import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

