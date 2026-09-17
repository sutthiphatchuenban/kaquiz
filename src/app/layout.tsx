import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const plex = IBM_Plex_Sans_Thai({
  variable: "--font-plex",
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  display: "swap",
});

const press = Press_Start_2P({
  variable: "--font-press",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KaQuiz — Arcade Edition",
  description:
    "สร้าง Quiz แบบ Interactive, เชิญเพื่อนมาเล่น และแข่งขันกันแบบ Real-time ในบรรยากาศอาร์เคดสุดมันส์!",
  keywords: ["quiz", "kahoot", "education", "realtime", "game", "learning"],
  authors: [{ name: "KaQuiz Team" }],
};

export const viewport: Viewport = {
  themeColor: "#6234dc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${plex.variable} ${press.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
