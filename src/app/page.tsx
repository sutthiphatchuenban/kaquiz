"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BarChart3,
  ChevronRight,
  Gamepad2,
  ImageIcon,
  Pencil,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Marquee } from "@/components/marquee";
import { ArcadeSprite } from "@/components/arcade-sprite";
import { HashLink } from "@/components/hash-link";

const HERO_STATS = [
  { icon: Sparkles, value: "AI", label: "สร้างข้อสอบจากหัวข้อ" },
  { icon: Users, value: "∞", label: "ผู้เล่นพร้อมกันแบบไม่จำกัด" },
  { icon: Trophy, value: "LIVE", label: "คะแนนอัปเดตทันที" },
];

const FEATURES = [
  {
    n: "01",
    color: "#ff89b2",
    icon: Sparkles,
    badge: "AI",
    label: "SMART MODE",
    title: "ร่างข้อสอบให้ในคลิกเดียว",
    desc: "พิมพ์หัวข้อที่อยากสอน ระบบจะช่วยคิดคำถามและตัวเลือกให้ก่อนนำไปปรับต่อ",
  },
  {
    n: "02",
    color: "#79def1",
    icon: Pencil,
    badge: "MANUAL",
    label: "FULL CONTROL",
    title: "แก้ได้ทุกตัวอักษร",
    desc: "สลับข้อถูก เพิ่มคำอธิบาย ตั้งเวลา และกำหนดคะแนนได้เองแบบละเอียด",
  },
  {
    n: "03",
    color: "#ffd25d",
    icon: Zap,
    badge: "LIVE",
    label: "REALTIME",
    title: "เล่นสดพร้อมกันทั้งห้อง",
    desc: "แชร์ PIN 6 หลักให้ทุกคน แล้วเริ่มเกมพร้อมกันได้ในไม่กี่วินาที",
  },
  {
    n: "04",
    color: "#a9e5ac",
    icon: Trophy,
    badge: "RANK",
    label: "SCOREBOARD",
    title: "ตารางคะแนนขยับทันที",
    desc: "ทุกคำตอบถูกนับแบบเรียลไทม์ พร้อมจัดอันดับผู้เล่นให้ลุ้นกันทุกข้อ",
  },
  {
    n: "05",
    color: "#c5a5f2",
    icon: BarChart3,
    badge: "REPORT",
    label: "AFTER GAME",
    title: "ย้อนดูผลย้อนหลัง",
    desc: "ดูประวัติเกมที่จัดไปแล้ว จำนวนผู้เล่น และคะแนนเฉลี่ยของแต่ละรอบ",
  },
  {
    n: "06",
    color: "#ffb878",
    icon: ImageIcon,
    badge: "MEDIA",
    label: "VISUAL",
    title: "ใส่รูปให้คำถาม",
    desc: "อัปโหลดรูปประกอบได้เลย เหมาะกับคำถามภาพหรือโจทย์ที่ต้องดูรายละเอียด",
  },
];

const STEPS = [
  {
    n: "01",
    title: "สร้าง Quiz",
    desc: "เริ่มจากหัวข้อ หรือไล่พิมพ์คำถามเองก็ได้ ไม่ต้องมีพื้นฐานอะไรก็ทำได้",
  },
  {
    n: "02",
    title: "เปิดห้อง แชร์ PIN",
    desc: "กดโฮสต์แล้วแชร์รหัส 6 หลักบนจอ ทุกคนเข้าเล่นได้จากมือถือ",
  },
  {
    n: "03",
    title: "แข่งกัน แล้วดูผล",
    desc: "ตอบให้ไวที่สุดเพื่อเก็บแต้ม พร้อมดูอันดับและรายงานหลังเกมจบ",
  },
];

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
    <div className="min-h-dvh">
      <SiteHeader />

      <main>
        {/* ================= HERO ================= */}
        <section className="relative pb-24 pt-14">
          <span
            aria-hidden
            className="kq-pixel animate-twinkle pointer-events-none absolute left-[54%] top-6 hidden text-[35px] text-[var(--sunny)] lg:block"
          >
            ✦
          </span>
          <span
            aria-hidden
            className="kq-pixel pointer-events-none absolute right-10 top-52 hidden text-[26px] text-[var(--electric)] lg:block"
          >
            ✳
          </span>

          <div className="kq-shell grid items-center gap-14 lg:grid-cols-2">
            {/* ---- Copy ---- */}
            <div className="animate-slide-up">
              <span className="inline-flex items-center gap-2 border-[3px] border-line bg-[var(--electric)] px-3.5 py-2.5 shadow-[5px_5px_0_var(--pop)]">
                <span className="size-2.5 animate-pulse rounded-full bg-[#ff407c] ring-[3px] ring-white/70" />
                <span className="kq-pixel text-[9px] text-[#211543]">
                  WELCOME TO THE QUIZ ARCADE
                </span>
              </span>

              <h1 className="kq-title-xl mt-8">
                เปลี่ยนทุกคำถาม
                <br />
                ให้เป็น <span className="text-[var(--sunny)]">เกมโชว์</span>
                <br />
                ที่ทั้งห้องพร้อมเล่น <span aria-hidden>✳</span>
              </h1>

              <p className="mt-6 max-w-lg text-[15px] font-medium leading-loose text-[#f2e6ff]">
                สร้าง quiz ของคุณเอง แล้วชวนเพื่อน เพื่อนร่วมงาน หรือนักเรียน
                มาแข่งกันตอบแบบสด ๆ ใครไวและแม่นที่สุด ขึ้นแท่นอันดับ 1 บนจอ
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="kq-btn kq-btn-yellow">
                  เริ่มต้นฟรี
                  <ChevronRight className="size-4" />
                </Link>
                <HashLink href="#join" block="center" className="kq-btn kq-btn-pink">
                  <Gamepad2 className="size-4" />
                  เข้าร่วมด้วย PIN
                </HashLink>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
                {HERO_STATS.map(({ icon: Icon, value, label }, i) => (
                  <div key={label} className="flex items-center gap-6">
                    {i > 0 ? (
                      <span className="hidden h-10 w-[2px] bg-[#bb9fff]/60 sm:block" />
                    ) : null}
                    <div className="kq-stat">
                      <span className="kq-stat-icon">
                        <Icon className="size-5" strokeWidth={2.5} />
                      </span>
                      <span>
                        <span className="kq-stat-value block">{value}</span>
                        <span className="kq-stat-label block">{label}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ---- Arcade cabinet ---- */}
            <div className="relative mx-auto w-full max-w-md">
              <span className="kq-sticker absolute -right-3 -top-5 z-10 rotate-[9deg] px-3 py-2">
                NEW! ✦
              </span>
              <span className="kq-sticker animate-wiggle absolute -left-4 top-28 z-10 rotate-[-13deg] px-3 py-3">
                100%
                <br />
                FUN!
              </span>

              <div className="border-4 border-line bg-[var(--grape)] shadow-hard-xl">
                {/* title bar */}
                <div className="flex h-12 items-center justify-between border-b-4 border-line bg-[var(--sunny)] px-3.5">
                  <span className="kq-pixel text-[9px] text-[#211543]">♥ KAQUIZ.EXE</span>
                  <span className="flex gap-1.5" aria-hidden>
                    <i className="size-3 border-[3px] border-[#211543] bg-[var(--candy)]" />
                    <i className="size-3 border-[3px] border-[#211543] bg-[var(--electric)]" />
                    <i className="size-3 border-[3px] border-[#211543] bg-[var(--mint)]" />
                  </span>
                </div>

                {/* screen */}
                <div
                  className="relative grid h-[330px] place-items-center overflow-hidden bg-[var(--arcade-deep)]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                >
                  <span className="kq-pixel animate-twinkle absolute right-6 top-6 text-lg text-[var(--sunny)]" aria-hidden>
                    ✦
                  </span>
                  <span className="kq-pixel animate-twinkle absolute bottom-24 left-7 text-base text-[var(--candy)]" aria-hidden>
                    ✳
                  </span>

                  <span className="absolute left-4 top-5 border-[3px] border-[#211543] bg-[var(--paper)] px-3 py-2 text-sm font-bold text-[#211543] shadow-[5px_5px_0_#211543]">
                    PRESS START! ♡
                  </span>

                  <ArcadeSprite
                    className="size-44 drop-shadow-[6px_6px_0_rgba(0,0,0,0.35)]"
                    title="หุ่นยนต์พิกเซล KaQuiz"
                  />

                  <div className="absolute inset-x-3.5 bottom-3.5 flex items-center justify-between gap-2">
                    <span className="kq-badge">LV.01 • READY</span>
                    <span className="kq-badge kq-badge-cyan">HOST → /host/[pin]</span>
                  </div>
                </div>
              </div>

              <div
                aria-hidden
                className="absolute -bottom-4 left-5 right-5 h-4 border-4 border-line bg-[var(--candy)]"
              />
            </div>
          </div>
        </section>

        <Marquee
          items={[
            "QUIZ ARCADE",
            "PRESS START",
            "BEAT THE CLOCK",
            "TOP THE LEADERBOARD",
            "PLAY TOGETHER",
          ]}
        />

        {/* ================= FEATURES ================= */}
        <section id="features" className="scroll-mt-28 bg-[var(--cream)] py-20">
          <div className="kq-shell">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="kq-overline">01 / WHAT&apos;S INSIDE</p>
                <h2 className="kq-title mt-2">ในนี้มีอะไรให้เล่นบ้าง 🎮</h2>
              </div>
              <p className="max-w-sm text-sm font-semibold text-[#564765] dark:text-[var(--muted-foreground)]">
                ทุกอย่างที่ต้องใช้จัดเกม quiz ให้สนุก อยู่ครบในที่เดียว
              </p>
            </div>

            <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <article key={f.n} className="kq-card kq-card-hover flex flex-col">
                    <div
                      className="kq-art relative grid h-44 place-items-center"
                      style={{ backgroundColor: f.color }}
                    >
                      <span className="kq-badge absolute left-3 top-3">{f.n}</span>
                      <span className="grid size-28 rotate-[4deg] place-items-center border-4 border-dashed border-white/75">
                        <Icon className="size-12 text-[#211543]" strokeWidth={2.4} />
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl font-bold">{f.title}</h3>
                        <span className="kq-badge kq-badge-paper">{f.badge}</span>
                      </div>
                      <p className="flex-1 text-sm font-medium text-muted-foreground">
                        {f.desc}
                      </p>
                      <div className="flex items-center justify-between border-t-2 border-dashed border-line/30 pt-3">
                        <span className="kq-pixel text-[8px] text-[var(--candy)]">
                          ✳ {f.label}
                        </span>
                        <Link
                          href="/register"
                          className="kq-pixel text-[8px] font-bold text-[#6234dc] hover:underline dark:text-[var(--sunny)]"
                        >
                          ลองใช้ ↗
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= HOW TO PLAY ================= */}
        <section id="how" className="scroll-mt-28 py-20">
          <div className="kq-shell">
            <div className="max-w-2xl">
              <p className="kq-overline text-[var(--electric)]">02 / HOW TO PLAY</p>
              <h2 className="kq-title-xl mt-2 text-[clamp(1.8rem,3.6vw,2.5rem)]">
                แค่ 3 ขั้นตอน ก็เริ่มเกมได้
              </h2>
              <p className="mt-4 text-sm font-medium leading-loose text-[#f2e6ff]">
                ไม่ต้องติดตั้งอะไรเพิ่ม เปิดเบราว์เซอร์แล้วเล่นได้เลยทั้งฝั่งคนจัดและคนเล่น
              </p>
            </div>

            <div className="mt-10 grid gap-7 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <article key={s.n} className="kq-card kq-card-hover p-6">
                  <div className="flex items-center justify-between">
                    <span
                      className={`grid size-14 place-items-center border-[3px] border-[#211543] font-bold text-[#211543] shadow-[4px_4px_0_#211543] ${
                        ["bg-[var(--sunny)]", "bg-[var(--electric)]", "bg-[var(--mint)]"][i]
                      }`}
                    >
                      <span className="kq-pixel text-[11px]">{s.n}</span>
                    </span>
                    <span aria-hidden className="kq-pixel text-lg text-[var(--candy)]">
                      ✦
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
                    {s.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ================= JOIN / BONUS STAGE ================= */}
        <section id="join" className="scroll-mt-28 pb-10 pt-4">
          <div className="kq-shell">
            <div className="relative border-4 border-line bg-[var(--mint)] shadow-hard-xl dark:bg-[#1f5f5c]">
              <span className="kq-sticker absolute -top-6 left-6 z-10 px-3 py-2">
                BONUS STAGE ✦
              </span>

              <div className="grid items-center gap-10 p-8 pt-12 md:grid-cols-[1.1fr_1fr] md:p-12">
                <div>
                  <p className="kq-overline text-[#20514a] dark:text-[var(--electric)]">
                    03 / JOIN THE GAME
                  </p>
                  <h2 className="mt-3 text-[clamp(1.7rem,3.4vw,2.35rem)] font-extrabold leading-snug text-[#211543]">
                    มี PIN อยู่ในมือแล้ว?
                    <br />
                    กระโดดเข้าห้องได้เลย
                  </h2>
                  <p className="mt-4 max-w-md text-sm font-semibold leading-loose text-[#26483e] dark:text-[#d9fff3]">
                    กรอกรหัส 6 หลักที่เห็นบนจอโฮสต์ แล้วตั้งชื่อเล่นของคุณ
                    พร้อมแข่งกับทุกคนในห้อง
                  </p>

                  <div className="mt-7">
                    <label htmlFor="join-pin" className="kq-label text-[#211543]">
                      Game PIN
                    </label>
                    <input
                      id="join-pin"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={6}
                      placeholder="000000"
                      value={gamePin}
                      onChange={(e) =>
                        setGamePin(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleJoinGame();
                      }}
                      className="kq-input kq-pixel-lg h-16 border-[#211543] text-center text-2xl tracking-[0.35em]"
                      aria-label="กรอก Game PIN 6 หลัก"
                    />

                    <div className="mt-3 flex justify-center gap-2" aria-hidden>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-2 w-6 border-2 border-[#211543] ${
                            i < gamePin.length ? "bg-[#211543]" : "bg-transparent"
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleJoinGame}
                      disabled={gamePin.length !== 6}
                      className="kq-btn kq-btn-yellow kq-btn-block kq-btn-lg mt-5"
                    >
                      กระโดดเข้าสู่เกม
                      <ChevronRight className="size-5" />
                    </button>
                    <p className="mt-3 text-center text-xs font-bold text-[#26483e] dark:text-[#d9fff3]">
                      ยังไม่มี PIN? ขอจากคนที่เปิดห้องอยู่ได้เลย
                    </p>
                  </div>
                </div>

                {/* decorative arcade panel */}
                <div className="relative mx-auto hidden w-full max-w-xs md:block">
                  <div className="border-4 border-[#211543] bg-[var(--arcade-deep)] p-5 shadow-hard-lg">
                    <div className="grid place-items-center gap-4">
                      <ArcadeSprite kind="trophy" className="size-28" title="ถ้วยรางวัลพิกเซล" />
                      <span className="kq-pixel text-center text-[9px] leading-[2] text-[var(--sunny)]">
                        TOP SCORE
                        <br />
                        <span className="text-[var(--on-arcade)]">PLAYER 01</span>
                      </span>
                      <div className="grid w-full grid-cols-3 gap-2" aria-hidden>
                        <span className="h-3 bg-[var(--candy)]" />
                        <span className="h-3 bg-[var(--electric)]" />
                        <span className="h-3 bg-[var(--sunny)]" />
                      </div>
                    </div>
                  </div>
                  <span className="kq-sticker absolute -bottom-4 -right-3 rotate-[7deg] px-3 py-2">
                    GO! GO!
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
