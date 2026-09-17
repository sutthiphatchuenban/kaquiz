import Link from "next/link";
import { ArcadeSprite } from "@/components/arcade-sprite";

export function SiteFooter() {
    return (
        <footer
            className="mt-16 border-t-4 text-[var(--on-arcade)]"
            style={{ background: "var(--arcade-deep)", borderColor: "var(--sunny)" }}
        >
            <div className="kq-shell flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                    <Link href="/" className="kq-brand">
                        <span className="kq-brand-mark">
                            <ArcadeSprite kind="bot" className="size-7" />
                        </span>
                        <span className="block">
                            <span className="kq-pixel-lg block text-[11px]">KAQUIZ</span>
                            <span className="kq-pixel block text-[6px] opacity-75">ARCADE</span>
                        </span>
                    </Link>
                    <p className="max-w-xs text-sm font-medium text-[#e3d5fd]">
                        เปลี่ยนทุกห้องเรียนให้เป็นเกมโชว์ สร้าง quiz เล่นสดกับเพื่อนได้ในไม่กี่นาที
                    </p>
                </div>

                <div className="kq-pixel text-[8px] leading-[2] text-[#f3e6ff] sm:text-right">
                    <p>MADE WITH ♥ &amp; PIXELS</p>
                    <p className="mt-2 opacity-75">© 2026 KAQUIZ / ARCADE EDITION</p>
                </div>
            </div>
        </footer>
    );
}
