"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Zap,
  Users,
  Trophy,
  Play,
  ChevronRight,
  Gamepad2
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Home() {
  const [gamePin, setGamePin] = useState("");
  const router = useRouter();

  const handleJoinGame = () => {
    if (gamePin.length !== 6) {
      toast.error("Game PIN ต้องมี 6 หลัก");
      return;
    }
    router.push(`/play/${gamePin}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">KaQuiz</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">เข้าสู่ระบบ</Button>
            </Link>
            <Link href="/register">
              <Button>เริ่มต้นใช้งาน</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 gradient-kahoot opacity-95" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 py-24 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="text-white space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur text-sm font-medium">
                <Gamepad2 className="w-4 h-4" />
                <span>แพลตฟอร์ม Quiz แบบ Real-time</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
                เรียนรู้ได้สนุก
                <br />
                <span className="text-yellow-300">ด้วย KaQuiz!</span>
              </h1>
              <p className="text-lg md:text-xl text-white/80 max-w-lg">
                สร้าง Quiz แบบ Interactive, เชิญเพื่อนมาเล่น และแข่งขันกันแบบ Real-time
                ทำให้การเรียนรู้สนุกยิ่งขึ้น!
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register">
                  <Button size="lg" className="h-14 px-8 text-lg bg-white text-primary hover:bg-white/90">
                    สร้าง Quiz ฟรี
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/30 text-white hover:bg-white/10">
                    เข้าสู่ระบบ
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Join Game Card */}
            <div className="flex justify-center lg:justify-end">
              <Card className="w-full max-w-md border-none shadow-2xl bg-card">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Play className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">เข้าร่วมเกม</CardTitle>
                  <CardDescription>ใส่ Game PIN เพื่อเริ่มเล่น</CardDescription>
                </CardHeader>
                <div className="px-6 pb-6 space-y-4">
                  <Input
                    type="text"
                    placeholder="Game PIN"
                    value={gamePin}
                    onChange={(e) => setGamePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-16 text-center text-3xl font-mono tracking-[0.5em] placeholder:tracking-normal placeholder:text-base"
                    maxLength={6}
                  />
                  <Button
                    onClick={handleJoinGame}
                    className="w-full h-14 text-lg font-semibold"
                    disabled={gamePin.length !== 6}
                  >
                    เข้าร่วม
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">ทำไมต้อง KaQuiz?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              แพลตฟอร์มที่ออกแบบมาเพื่อให้การเรียนรู้เป็นเรื่องสนุกและน่าสนใจ
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card">
              <CardHeader>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(255, 51, 85, 0.1)" }}>
                  <Zap className="w-7 h-7" style={{ color: "var(--answer-red)" }} />
                </div>
                <CardTitle>รวดเร็วทันใจ</CardTitle>
                <CardDescription className="text-base">
                  สร้าง Quiz ได้ภายในไม่กี่นาที พร้อมเริ่มเล่นได้ทันที
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card">
              <CardHeader>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(69, 163, 229, 0.1)" }}>
                  <Users className="w-7 h-7" style={{ color: "var(--answer-blue)" }} />
                </div>
                <CardTitle>เล่นพร้อมกัน</CardTitle>
                <CardDescription className="text-base">
                  รองรับผู้เล่นหลายคนพร้อมกัน แข่งขันแบบ Real-time
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card">
              <CardHeader>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(102, 191, 57, 0.1)" }}>
                  <Trophy className="w-7 h-7" style={{ color: "var(--answer-green)" }} />
                </div>
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription className="text-base">
                  ดูอันดับแบบ Real-time สร้างความตื่นเต้นให้ผู้เล่น
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <Card className="overflow-hidden border-none shadow-2xl">
            <div className="grid md:grid-cols-2">
              <div className="gradient-kahoot p-12 text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  พร้อมเริ่มสร้าง Quiz?
                </h2>
                <p className="text-white/80 text-lg mb-8">
                  ลงทะเบียนฟรีวันนี้ และเริ่มสร้าง Quiz สุดมันส์ของคุณ
                </p>
                <Link href="/register">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                    เริ่มต้นเลย - ฟรี!
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
              <div className="bg-muted/50 p-12 flex flex-col justify-center">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold">✓</span>
                    </div>
                    <span className="text-lg">สร้าง Quiz ได้ไม่จำกัด</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold">✓</span>
                    </div>
                    <span className="text-lg">รองรับผู้เล่นหลายคน</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold">✓</span>
                    </div>
                    <span className="text-lg">ดูสถิติและรายงาน</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold">KaQuiz</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2026 KaQuiz. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
