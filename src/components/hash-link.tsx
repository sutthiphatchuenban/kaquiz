"use client";

import type { ReactNode } from "react";

/**
 * Anchor that scrolls smoothly to an in-page section.
 *
 * Native fragment navigation alone is unreliable inside the App Router (a
 * `<Link href="#x">` can be swallowed without scrolling), so we scroll
 * explicitly. `scroll-margin-top` on the target keeps it clear of the sticky
 * top bar.
 *
 * `block="center"` is useful for a short panel that sits near the end of the
 * page: `"start"` would clamp at the maximum scroll position and leave the
 * panel partly cut off.
 */
export function HashLink({
    href,
    className,
    children,
    block = "start",
    ...rest
}: {
    href: string;
    className?: string;
    children: ReactNode;
    block?: ScrollLogicalPosition;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">) {
    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        const id = href.startsWith("#") ? href.slice(1) : null;
        if (!id) return;

        const target = document.getElementById(id);
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block });
        window.history.replaceState(null, "", href);
    };

    return (
        <a href={href} onClick={handleClick} className={className} {...rest}>
            {children}
        </a>
    );
}
