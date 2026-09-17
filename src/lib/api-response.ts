/**
 * Every API route in this app answers with this envelope.
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

const FALLBACK_MESSAGES: Record<number, string> = {
    400: "คำขอไม่ถูกต้อง — กรุณาตรวจสอบข้อมูลอีกครั้ง",
    401: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
    403: "คุณไม่มีสิทธิ์ทำรายการนี้",
    404: "ไม่พบข้อมูลที่ต้องการ",
    429: "มีคำขอมากเกินไป — กรุณารอสักครู่แล้วลองใหม่",
    500: "เซิร์ฟเวอร์เกิดข้อผิดพลาด — กรุณาลองใหม่อีกครั้ง",
    502: "เซิร์ฟเวอร์ปลายทางไม่ตอบสนอง — กรุณาลองใหม่อีกครั้ง",
    503: "บริการยังไม่พร้อมใช้งาน — กรุณาลองใหม่อีกครั้งในอีกสักครู่",
    504: "ใช้เวลานานเกินกำหนด (timeout) — ลองลดจำนวนคำถามลง หรือกดสร้างใหม่อีกครั้ง",
};

function messageForStatus(status: number): string {
    const known = FALLBACK_MESSAGES[status];
    if (known) return known;
    return status >= 500
        ? "เซิร์ฟเวอร์เกิดข้อผิดพลาด — กรุณาลองใหม่อีกครั้ง"
        : "เกิดข้อผิดพลาด กรุณาลองใหม่";
}

/**
 * Reads an API response without assuming the body actually is JSON.
 *
 * A function that outlives its platform limit (for example Vercel's 60s
 * `maxDuration`) is killed before it can answer, and the platform returns a
 * plain-text error page. Calling `res.json()` on that throws
 * `SyntaxError: Unexpected token 'A', "An error o"...`, which hides the real
 * problem. This turns any unreadable body into a message based on the status.
 */
export async function readApiResponse<T = unknown>(
    res: Response
): Promise<ApiResponse<T>> {
    const text = await res.text();

    if (text) {
        try {
            const parsed: unknown = JSON.parse(text);
            if (parsed && typeof parsed === "object") {
                const body = parsed as ApiResponse<T>;
                // A failure without a message still needs something to show.
                if (body.success === false && !body.error) {
                    return { success: false, error: messageForStatus(res.status) };
                }
                return body;
            }
        } catch {
            // Body was not JSON — fall through to the status-based message.
        }
    }

    return { success: false, error: messageForStatus(res.status) };
}
