"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Zap,
  Users,
  Trophy,
  Play,
  ChevronRight,
  Gamepad2,
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

  const features = [
    { icon: Zap, label: "AI ช่วยสร้าง", color: "#f59e0b" },
    { icon: Users, label: "เล่นพร้อมกัน", color: "#06b6d4" },
    { icon: Trophy, label: "Leaderboard", color: "#10b981" },
  ];

  return (
    <div className="lp-root">
      {/* ── Animated background ── */}
      <div className="lp-bg" aria-hidden="true">
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />
        <div className="lp-grid" />
      </div>

      {/* ── Nav ── */}
      <header className="lp-nav">
        <Link href="/" className="lp-logo">
          <img src="/favicon.ico" alt="KaQuiz" className="w-8 h-8 rounded-lg object-contain" />
          <span className="lp-logo-text">KaQuiz</span>
        </Link>
        <div className="lp-nav-actions">
          <Link href="/login">
            <Button variant="ghost" className="lp-btn-ghost">เข้าสู่ระบบ</Button>
          </Link>
          <Link href="/register">
            <Button className="lp-btn-primary">เริ่มต้นฟรี</Button>
          </Link>
        </div>
      </header>

      {/* ── Main: split layout ── */}
      <main className="lp-main">
        {/* Left panel */}
        <section className="lp-left">
          <div className="lp-badge">
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Next-Gen Quiz Platform</span>
          </div>

          <h1 className="lp-headline">
            ให้การเรียนรู้
            <br />
            <span className="lp-headline-accent">เป็นเรื่องสนุก!</span>
          </h1>

          <p className="lp-subtext">
            สร้าง Quiz สุดพรีเมียม, จัดเกมสดแบบ Real-time
            และพาทุกคนเข้าสู่โลกแห่งการแข่งขันสุดมันส์
          </p>

          {/* Feature pills */}
          <div className="lp-features">
            {features.map(({ icon: Icon, label, color }) => (
              <div key={label} className="lp-feature-pill">
                <div className="lp-feature-icon" style={{ background: color + "22", color }}>
                  <Icon className="w-4 h-4" />
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <Link href="/register">
            <Button className="lp-cta-btn">
              สร้าง Quiz ของคุณเลย
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </Link>
        </section>

        {/* Right panel – Join card */}
        <section className="lp-right">
          <div className="lp-card">
            {/* Glow ring */}
            <div className="lp-card-glow" aria-hidden="true" />

            <div className="lp-card-icon-wrap">
              <div className="lp-card-icon">
                <Play className="w-9 h-9 text-white fill-white" />
              </div>
            </div>

            <h2 className="lp-card-title">พร้อมเล่นหรือยัง?</h2>
            <p className="lp-card-desc">กรอก Game PIN จากหน้าจอ Host</p>

            <div className="lp-pin-wrap">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={gamePin}
                onChange={(e) =>
                  setGamePin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="lp-pin-input"
                maxLength={6}
              />
              {/* PIN dots indicator */}
              <div className="lp-pin-dots">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="lp-pin-dot"
                    data-filled={i < gamePin.length ? "true" : "false"}
                  />
                ))}
              </div>
            </div>

            <Button
              onClick={handleJoinGame}
              className="lp-join-btn"
              disabled={gamePin.length !== 6}
            >
              กระโดดเข้าสู่เกม!
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>

            <p className="lp-card-hint">
              ไม่มี PIN? ขอจาก Host ของคุณ
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer strip ── */}
      <footer className="lp-footer">
        <span>© 2026 KaQuiz · Made with ❤️ in Thailand</span>
        <div className="lp-footer-links">
          <Link href="#">ความเป็นส่วนตัว</Link>
          <Link href="#">ติดต่อเรา</Link>
        </div>
      </footer>

      <style>{`
        /* ──────────────────────────────────────
           KaQuiz Landing Page – Viewport-fit
        ────────────────────────────────────── */

        .lp-root {
          position: relative;
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100dvh;
          overflow: hidden;
          background: #09090f;
          color: #fff;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* ── Background ── */
        .lp-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }
        .lp-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          animation: lp-drift 10s ease-in-out infinite alternate;
        }
        .lp-orb-1 {
          width: 520px; height: 520px;
          top: -180px; left: -120px;
          background: radial-gradient(circle, #7c3aed55, #4f46e522);
          animation-delay: 0s;
        }
        .lp-orb-2 {
          width: 400px; height: 400px;
          top: -120px; right: -80px;
          background: radial-gradient(circle, #db277755, #f59e0b22);
          animation-delay: 3s;
        }
        .lp-orb-3 {
          width: 350px; height: 350px;
          bottom: -100px; left: 35%;
          background: radial-gradient(circle, #0ea5e944, #7c3aed22);
          animation-delay: 6s;
        }
        @keyframes lp-drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, 20px) scale(1.08); }
        }
        .lp-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        /* ── Nav ── */
        .lp-nav {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2.5rem;
          height: 64px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(12px);
          flex-shrink: 0;
        }
        .lp-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .lp-logo-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px #8b5cf640;
        }
        .lp-logo-text {
          font-size: 1.3rem;
          font-weight: 900;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .lp-nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lp-btn-ghost {
          color: rgba(255,255,255,0.7) !important;
          background: transparent !important;
          border: none !important;
        }
        .lp-btn-ghost:hover {
          color: #fff !important;
          background: rgba(255,255,255,0.08) !important;
        }
        .lp-btn-primary {
          background: linear-gradient(135deg, #ec4899, #8b5cf6) !important;
          border: none !important;
          font-weight: 700;
          border-radius: 10px !important;
          box-shadow: 0 4px 20px #8b5cf630;
        }
        .lp-btn-primary:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        /* ── Main split layout ── */
        .lp-main {
          position: relative;
          z-index: 10;
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          overflow: hidden;
          min-height: 0;
        }

        /* ── Left panel ── */
        .lp-left {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3rem 4rem 3rem 4rem;
          gap: 1.5rem;
        }
        .lp-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: 999px;
          background: rgba(139,92,246,0.15);
          border: 1px solid rgba(139,92,246,0.3);
          color: #a78bfa;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          width: fit-content;
        }
        .lp-headline {
          font-size: clamp(2.2rem, 4vw, 3.5rem);
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin: 0;
        }
        .lp-headline-accent {
          background: linear-gradient(90deg, #facc15, #f97316, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .lp-subtext {
          font-size: 1rem;
          line-height: 1.7;
          color: rgba(255,255,255,0.55);
          max-width: 440px;
          margin: 0;
        }
        .lp-features {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .lp-feature-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px 7px 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          font-size: 0.82rem;
          font-weight: 600;
          color: rgba(255,255,255,0.75);
        }
        .lp-feature-icon {
          width: 26px; height: 26px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .lp-cta-btn {
          background: #fff !important;
          color: #1e0a3c !important;
          font-size: 1rem !important;
          font-weight: 800 !important;
          padding: 0 2rem !important;
          height: 52px !important;
          border-radius: 14px !important;
          border: none !important;
          box-shadow: 0 8px 30px rgba(255,255,255,0.12);
          width: fit-content;
          display: inline-flex;
          align-items: center;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .lp-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(255,255,255,0.18);
        }

        /* ── Divider ── */
        .lp-main::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 10%;
          bottom: 10%;
          width: 1px;
          background: linear-gradient(to bottom,
            transparent,
            rgba(255,255,255,0.08) 30%,
            rgba(255,255,255,0.08) 70%,
            transparent
          );
        }

        /* ── Right panel ── */
        .lp-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        .lp-card {
          position: relative;
          width: 100%;
          max-width: 380px;
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 28px;
          padding: 2.5rem 2rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
          box-shadow:
            0 32px 64px rgba(0,0,0,0.4),
            0 0 0 1px rgba(255,255,255,0.05) inset;
          animation: lp-card-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }
        @keyframes lp-card-in {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .lp-card-glow {
          position: absolute;
          top: -1px; left: 50%;
          transform: translateX(-50%);
          width: 60%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #06b6d4, #8b5cf6, transparent);
          border-radius: 2px;
        }
        .lp-card-icon-wrap {
          position: relative;
        }
        .lp-card-icon-wrap::before {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          background: radial-gradient(circle, #06b6d440, transparent 70%);
        }
        .lp-card-icon {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 32px #06b6d440;
          animation: lp-float 4s ease-in-out infinite;
        }
        @keyframes lp-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-6px); }
        }
        .lp-card-title {
          font-size: 1.5rem;
          font-weight: 900;
          letter-spacing: -0.02em;
          margin: 0;
          text-align: center;
        }
        .lp-card-desc {
          font-size: 0.875rem;
          color: rgba(255,255,255,0.45);
          margin: -0.5rem 0 0;
          text-align: center;
        }
        .lp-pin-wrap {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .lp-pin-input {
          width: 100% !important;
          height: 72px !important;
          text-align: center !important;
          font-size: 2.5rem !important;
          font-weight: 900 !important;
          font-family: 'Courier New', monospace !important;
          letter-spacing: 0.4em !important;
          background: rgba(0,0,0,0.4) !important;
          border: 1.5px solid rgba(255,255,255,0.1) !important;
          border-radius: 16px !important;
          color: #fff !important;
          transition: border-color 0.2s;
        }
        .lp-pin-input::placeholder {
          color: rgba(255,255,255,0.15) !important;
        }
        .lp-pin-input:focus {
          border-color: #06b6d4 !important;
          box-shadow: 0 0 0 3px rgba(6,182,212,0.15) !important;
          outline: none !important;
        }
        .lp-pin-dots {
          display: flex;
          gap: 6px;
        }
        .lp-pin-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          transition: background 0.2s, transform 0.2s;
        }
        .lp-pin-dot[data-filled="true"] {
          background: #06b6d4;
          transform: scale(1.2);
        }
        .lp-join-btn {
          width: 100% !important;
          height: 54px !important;
          font-size: 1.05rem !important;
          font-weight: 800 !important;
          border-radius: 14px !important;
          border: none !important;
          background: linear-gradient(135deg, #06b6d4, #3b82f6) !important;
          box-shadow: 0 8px 24px rgba(6,182,212,0.35) !important;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.2s !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .lp-join-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(6,182,212,0.45) !important;
        }
        .lp-join-btn:disabled {
          opacity: 0.4 !important;
        }
        .lp-card-hint {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.28);
          margin: -0.5rem 0 0;
          text-align: center;
        }

        /* ── Footer ── */
        .lp-footer {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2.5rem;
          height: 44px;
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 0.72rem;
          color: rgba(255,255,255,0.25);
          flex-shrink: 0;
        }
        .lp-footer-links {
          display: flex;
          gap: 1.5rem;
        }
        .lp-footer-links a {
          color: rgba(255,255,255,0.25);
          text-decoration: none;
          transition: color 0.2s;
        }
        .lp-footer-links a:hover {
          color: rgba(255,255,255,0.6);
        }

        /* ── Responsive (tablet/mobile) ── */
        @media (max-width: 768px) {
          .lp-root { height: auto; min-height: 100dvh; overflow: auto; }
          .lp-main { grid-template-columns: 1fr; }
          .lp-main::before { display: none; }
          .lp-left { padding: 2.5rem 1.5rem 1.5rem; align-items: center; text-align: center; }
          .lp-subtext { text-align: center; }
          .lp-features { justify-content: center; }
          .lp-right { padding: 1rem 1.5rem 2rem; }
          .lp-card { max-width: 100%; }
          .lp-footer { flex-direction: column; gap: 4px; height: auto; padding: 12px; }
        }
      `}</style>
    </div>
  );
}
