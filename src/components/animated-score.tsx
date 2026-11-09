"use client";

import { useEffect, useRef } from "react";

export function AnimatedScore({ value, delay = 0, duration = 900 }: {
    value: number;
    delay?: number;
    duration?: number;
}) {
    const numberRef = useRef<HTMLSpanElement>(null);
    const formatted = value.toLocaleString("th-TH");

    useEffect(() => {
        const element = numberRef.current;
        if (!element) return;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        let frame = 0;
        let startedAt: number | null = null;
        const finish = () => {
            cancelAnimationFrame(frame);
            element.textContent = value.toLocaleString("th-TH");
        };
        const animate = (timestamp: number) => {
            startedAt ??= timestamp;
            const progress = Math.min(1, Math.max(0, (timestamp - startedAt - delay) / Math.max(1, duration)));
            const eased = 1 - Math.pow(1 - progress, 3);
            element.textContent = Math.round(value * eased).toLocaleString("th-TH");
            if (progress < 1) frame = requestAnimationFrame(animate);
        };
        const onMotionChange = () => {
            if (reducedMotion.matches) finish();
        };
        if (reducedMotion.matches || value === 0) {
            finish();
        } else {
            element.textContent = "0";
            frame = requestAnimationFrame(animate);
        }
        reducedMotion.addEventListener("change", onMotionChange);
        return () => {
            cancelAnimationFrame(frame);
            reducedMotion.removeEventListener("change", onMotionChange);
        };
    }, [value, delay, duration]);

    return (
        <>
            <span className="sr-only">{formatted}</span>
            <span ref={numberRef} aria-hidden="true" className="inline-block tabular-nums" style={{ minWidth: `${formatted.length}ch` }}>
                {formatted}
            </span>
        </>
    );
}
