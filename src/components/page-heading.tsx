import type { ReactNode } from "react";

export function PageHeading({
    overline,
    title,
    description,
    actions,
}: {
    overline?: string;
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {overline ? <p className="kq-overline mb-2">{overline}</p> : null}
                <h1 className="kq-title">{title}</h1>
                {description ? (
                    <p className="kq-subtitle mt-2 max-w-2xl text-sm">{description}</p>
                ) : null}
            </div>
            {actions ? (
                <div className="flex flex-wrap items-center gap-2">{actions}</div>
            ) : null}
        </div>
    );
}
