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
  Gamepad2,
  Rocket,
  Layout,
  Star
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
    router.push(`/join?pin=${gamePin}`);
  };

  return (
    <div className="min-h-screen game-bg text-white selection:bg-cyan-500 selection:text-white">
      {/* Background Blobs */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 mix-blend-overlay"></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0 border-white/5 mx-4 mt-4 rounded-2xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group transition-all transform active:scale-95">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              KaQuiz
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10 hidden sm:flex">
                เข้าสู่ระบบ
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-none shadow-lg shadow-pink-500/20 px-6 font-bold rounded-xl">
                เริ่มต้นโฮสต์เกม
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-10 animate-in slide-in-from-bottom">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-white/20 text-sm font-semibold text-cyan-300 animate-float">
                <Rocket className="w-4 h-4" />
                <span>Next Gen Learning Platform</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-black leading-[1.1] text-shadow-3d">
                  ให้การเรียนรู้
                  <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500">
                    เป็นเรื่องสนุก!
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-white/70 max-w-xl font-medium leading-relaxed">
                  สร้าง Quiz ระดับพรีเมียม, จัดกิจกรรม Interactive สดๆ
                  และพาทุกคนเข้าสู่โลกแห่งการแข่งขันที่สุดตื่นเต้น
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="h-16 px-10 text-xl font-black rounded-2xl bg-white text-purple-900 hover:bg-white/90 transform transition-all active:scale-95 shadow-xl">
                    สร้าง Quiz ของคุณ
                    <ChevronRight className="ml-2 w-6 h-6" />
                  </Button>
                </Link>
                <div className="flex items-center gap-3 px-4 py-2 opacity-60">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-primary bg-purple-500" />
                    ))}
                  </div>
                  <span className="text-sm font-medium">10,000+ ผู้ใช้งานในไทย</span>
                </div>
              </div>
            </div>

            {/* Right: Join Game PREMIUM CARD */}
            <div className="flex justify-center lg:justify-end animate-bounce-in" style={{ animationDelay: '0.2s' }}>
              <div className="w-full max-w-md relative">
                {/* Decorative particles behind card */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/20 blur-3xl rounded-full" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-500/20 blur-3xl rounded-full" />

                <Card className="glass-card border-t-white/30 border-l-white/30 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] transform rotate-1 hover:rotate-0 transition-all duration-500 rounded-[2.5rem] p-4">
                  <CardHeader className="text-center pb-8">
                    <div className="mx-auto w-20 h-20 rounded-[2rem] bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mb-6 shadow-2xl shadow-cyan-500/40 transform -translate-y-2 animate-float">
                      <Play className="w-10 h-10 text-white fill-white" />
                    </div>
                    <CardTitle className="text-3xl font-black mb-2 text-white italic tracking-tight">
                      พร้อมเล่นหรือยัง?
                    </CardTitle>
                    <CardDescription className="text-white/60 font-medium text-lg">
                      กรอก PIN จากหน้าจอ Host เพื่อเข้าสู่สนาม
                    </CardDescription>
                  </CardHeader>
                  <div className="px-6 pb-8 space-y-6">
                    <div className="relative group">
                      <Input
                        type="text"
                        placeholder="000000"
                        value={gamePin}
                        onChange={(e) => setGamePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="h-20 text-center text-4xl font-black font-mono tracking-[0.6em] bg-black/40 border-white/20 text-white rounded-2xl group-hover:border-cyan-400/50 transition-colors focus:border-cyan-400"
                        maxLength={6}
                      />
                      <div className="absolute inset-0 rounded-2xl border-2 border-white/0 group-focus-within:border-cyan-400/50 pointer-events-none transition-all" />
                    </div>
                    <Button
                      onClick={handleJoinGame}
                      className="w-full h-16 text-xl font-black rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 border-none shadow-xl shadow-cyan-900/40 transition-all active:translate-y-1 transform disabled:opacity-50"
                      disabled={gamePin.length !== 6}
                    >
                      กระโดดเข้าสู่เกม!
                      <ChevronRight className="ml-2 w-6 h-6" />
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Features Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "รวดเร็วสุดขีด",
                desc: "สร้าง Quiz สดใหม่ได้ทันใจด้วยระบบ AI ช่วยคิดยอดอัจฉริยะ",
                color: "from-red-500 to-pink-600"
              },
              {
                icon: Users,
                title: "เล่นสดพร้อมกัน",
                desc: "รองรับผู้เล่นเป็นร้อย แข่งขันกันแบบสดๆ เห็นผลวินาทีต่อวินาที",
                color: "from-blue-500 to-cyan-600"
              },
              {
                icon: Trophy,
                title: "รางวัลแห่งชัยชนะ",
                desc: "ลุ้นอันดับบน Leaderboard สุดเท่ และระบบคะแนนที่ยุติธรรม",
                color: "from-green-500 to-emerald-600"
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="glass-panel p-10 rounded-[2.5rem] border-white/10 hover:border-white/20 transition-all group hover:-translate-y-2"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-8 shadow-xl group-hover:rotate-12 transition-transform`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-white/60 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="glass-card rounded-[3rem] overflow-hidden p-2">
            <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-[2.8rem] p-12 lg:p-20 relative overflow-hidden text-center">
              {/* Decorative rings */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full pointer-events-none" />

              <div className="relative z-10 space-y-8 max-w-3xl mx-auto">
                <Star className="w-16 h-16 text-yellow-400 mx-auto fill-yellow-400 animate-pulse" />
                <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                  พร้อมจะก้าวสู่โลกของ
                  <br />
                  <span className="text-shadow-3d italic">KAAQUIZ</span> แล้วหรือยัง?
                </h2>
                <p className="text-xl text-white/70 font-medium">
                  เริ่มโฮสต์เกมวันนี้แบบไม่มีค่าใช้จ่าย แล้วคุณจะลืมการเรียนแบบเดิมๆ ไปเลย
                </p>
                <div className="pt-4">
                  <Link href="/register">
                    <Button size="lg" className="h-16 px-12 text-2xl font-black rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-2xl shadow-pink-500/40 group active:scale-95 transition-all">
                      สร้างห้อง Quiz ฟรีเลย!
                      <Zap className="ml-2 w-6 h-6 fill-current group-hover:animate-bounce" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 relative z-10">
        <div className="container mx-auto px-4 text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-900" />
            </div>
            <span className="text-2xl font-black tracking-tighter">KaQuiz</span>
          </div>
          <div className="flex justify-center gap-8 text-white/40 font-bold text-sm uppercase tracking-widest">
            <Link href="#" className="hover:text-white transition-colors">ความเป็นส่วนตัว</Link>
            <Link href="#" className="hover:text-white transition-colors">เงื่อนไขการใช้งาน</Link>
            <Link href="#" className="hover:text-white transition-colors">ติดต่อเรา</Link>
          </div>
          <p className="text-white/20 text-xs font-bold tracking-widest">
            © 2026 KAQUIZ DEVELOPMENT TEAM. CREATED WITH ❤️ IN THAILAND.
          </p>
        </div>
      </footer>
    </div>
  );
}
