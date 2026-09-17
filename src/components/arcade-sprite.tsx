/**
 * Hand-built pixel art sprite — no external assets, no image requests.
 * Rendered as an SVG grid of 1x1 rects so it stays crisp at any size.
 *
 * Legend:
 *   O = outline   B = body     L = highlight
 *   C = visor     Y = accent (sunny yellow)   P = accent (candy pink)
 */

const PALETTE: Record<string, string> = {
    O: "#211543",
    B: "#7048cf",
    L: "#c9b6ff",
    C: "#4ce9f5",
    Y: "#ffe14a",
    P: "#ff5a98",
};

const BOT = [
    ".......YY.......",
    ".......YY.......",
    "......YOOY......",
    "....OOOOOOOO....",
    "..OOBBBBBBBBOO..",
    ".OBBBBBBBBBBBBO.",
    ".OBCCCCCCCCCCBO.",
    ".OBCOOCCCCOOCBO.",
    ".OBCCCCCCCCCCBO.",
    ".OBPCCCCCCCCPBO.",
    ".OBBBBBBBBBBBBO.",
    "..OOBBBBBBBBOO..",
    "....OOOOOOOO....",
    "..OBBBBBBBBBBO..",
    "..OBCCBBBBCCBO..",
    "...OOOOOOOOOO...",
];

const TROPHY = [
    "..OOOOOOOOOOOO..",
    "..OYYYYYYYYYYO..",
    ".OOYYYYYYYYYYOO.",
    "OOYYOOOOOOOOYYOO",
    "OOYYOYYYYYYOYYOO",
    "OOYYOYYYYYYOYYOO",
    ".OOYOYYYYYYOYOO.",
    "..OOOYYYYYYOOO..",
    "....OOYYYYOO....",
    ".....OYYYYO.....",
    "......OYYO......",
    "......OYYO......",
    "....OOYYYYOO....",
    "...OYYYYYYYYO...",
    "..OYYYYYYYYYYO..",
    "..OOOOOOOOOOOO..",
];

type SpriteKind = "bot" | "trophy";

const SPRITES: Record<SpriteKind, string[]> = {
    bot: BOT,
    trophy: TROPHY,
};

export function ArcadeSprite({
    kind = "bot",
    className,
    title,
}: {
    kind?: SpriteKind;
    className?: string;
    title?: string;
}) {
    const art = SPRITES[kind];
    const rows = art.length;
    const cols = art[0].length;

    return (
        <svg
            viewBox={`0 0 ${cols} ${rows}`}
            className={className}
            shapeRendering="crispEdges"
            role="img"
            aria-label={title ?? (kind === "bot" ? "หุ่นยนต์พิกเซล KaQuiz" : "ถ้วยรางวัลพิกเซล")}
        >
            {title ? <title>{title}</title> : null}
            {art.flatMap((row, y) =>
                row.split("").map((ch, x) => {
                    const fill = PALETTE[ch];
                    if (!fill) return null;
                    return <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />;
                })
            )}
        </svg>
    );
}
