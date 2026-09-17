"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Day / night switch.
 *
 * Both icons are always rendered and swapped purely with CSS (`dark:` variant),
 * so the markup matches on the server and client — no mount effect required.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
    const { setTheme, resolvedTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="สลับโหมดกลางวัน / กลางคืน"
            title="สลับกลางวัน / กลางคืน"
            className={`kq-btn kq-btn-sm kq-btn-cyan !px-3 ${className}`}
        >
            <Moon className="size-4 dark:hidden" />
            <Sun className="hidden size-4 dark:block" />
        </button>
    );
}
