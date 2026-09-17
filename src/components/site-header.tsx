import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArcadeSprite } from "@/components/arcade-sprite";
import { HashLink } from "@/components/hash-link";

const NAV = [
    { href: "#features", label: "ทำอะไรได้บ้าง" },
    { href: "#how", label: "วิธีเล่น" },
    { href: "#join", label: "เข้าร่วมด้วย PIN" },
];

export function SiteHeader() {
    return (
        <header className="kq-topbar">
            <div className="kq-shell flex h-24 items-center justify-between gap-4">
                <Link href="/" className="kq-brand">
                    <span className="kq-brand-mark">
                        <ArcadeSprite kind="bot" className="size-7" />
                    </span>
                    <span className="block">
                        <span className="kq-pixel-lg block text-[11px]">KAQUIZ</span>
                        <span className="kq-pixel block text-[6px] opacity-75">ARCADE</span>
                    </span>
                </Link>

                <nav className="hidden items-center gap-7 md:flex" aria-label="เมนูหลัก">
                    {NAV.map((item) => (
                        <HashLink key={item.href} href={item.href} className="kq-navlink">
                            {item.label}
                        </HashLink>
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Link href="/login" className="kq-btn kq-btn-sm kq-btn-ghost hidden sm:inline-flex">
                        เข้าสู่ระบบ
                    </Link>
                    <Link href="/register" className="kq-btn kq-btn-sm kq-btn-yellow">
                        เริ่มต้นฟรี ↗
                    </Link>
                </div>
            </div>
            <div className="kq-topbar-rule" />
        </header>
    );
}
