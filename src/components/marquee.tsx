export function Marquee({
    items,
    repeat = 3,
}: {
    items: string[];
    repeat?: number;
}) {
    const chunk = Array.from({ length: repeat }, () => items).flat();

    return (
        <div className="kq-marquee" aria-hidden="true">
            <div className="kq-marquee-track">
                <span>
                    {chunk.map((item, i) => (
                        <span key={i}>{item} ✳ </span>
                    ))}
                </span>
                <span>
                    {chunk.map((item, i) => (
                        <span key={i}>{item} ✳ </span>
                    ))}
                </span>
            </div>
        </div>
    );
}
