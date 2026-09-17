import type { ReactNode } from "react";
import { ArcadeSprite } from "@/components/arcade-sprite";

export function EmptyState({
    title,
    description,
    action,
    icon,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
    icon?: ReactNode;
}) {
    return (
        <div className="kq-empty">
            <div className="grid size-20 place-items-center border-[3px] border-line bg-[var(--cream)] shadow-hard-sm">
                {icon ?? <ArcadeSprite kind="bot" className="size-12" />}
            </div>
            <h3 className="mt-2 text-xl font-bold text-ink">{title}</h3>
            {description ? (
                <p className="max-w-md text-sm font-medium text-muted-foreground">
                    {description}
                </p>
            ) : null}
            {action ? <div className="mt-3">{action}</div> : null}
        </div>
    );
}
