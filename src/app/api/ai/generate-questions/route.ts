import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1",
});

interface GeneratedQuestion {
    questionText: string;
    answers: {
        answerText: string;
        isCorrect: boolean;
        color: "red" | "blue" | "green" | "yellow";
        order: number;
    }[];
    timeLimit: number;
    points: number;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { topic, questionCount, difficulty = "medium", model = "gpt-oss-20b" } = body;

        if (!topic || !questionCount) {
            return NextResponse.json(
                { success: false, error: "กรุณากรอกหัวข้อและจำนวนคำถาม" },
                { status: 400 }
            );
        }

        const count = Math.min(Math.max(parseInt(questionCount), 1), 20);

        // Map model selection to NVIDIA NIM model IDs
        const modelMap: Record<string, string> = {
            "gpt-oss-20b": "openai/gpt-oss-20b",
            "gpt-oss-120b": "openai/gpt-oss-120b",
            "ministral-14b": "mistralai/ministral-14b-instruct-2512",
        };

        const selectedModel = modelMap[model] || "openai/gpt-oss-20b";

        // ── Batch strategy ────────────────────────────────────────────────
        // Cap each batch at 5 questions to avoid token-limit truncation.
        // Multiple batches are fired concurrently with Promise.all.
        const BATCH_SIZE = 5;
        const batches: number[] = [];
        let remaining = count;
        while (remaining > 0) {
            batches.push(Math.min(remaining, BATCH_SIZE));
            remaining -= BATCH_SIZE;
        }

        const buildPrompt = (batchCount: number, batchIndex: number) =>
            `สร้างคำถามแบบ Quiz จำนวน ${batchCount} ข้อ เกี่ยวกับหัวข้อ: "${topic}"
ระดับความยาก: ${difficulty === "easy" ? "ง่าย" : difficulty === "hard" ? "ยาก" : "ปานกลาง"}
${batches.length > 1 ? `(ชุดที่ ${batchIndex + 1}/${batches.length} — ห้ามซ้ำกับชุดก่อนหน้า)` : ""}

กรุณาตอบเป็น JSON array เท่านั้น ไม่ต้องมี markdown หรือข้อความอื่น โดยแต่ละคำถามต้องมีรูปแบบดังนี้:
[
  {
    "questionText": "คำถามสั้นๆ",
    "answers": [
      {"answerText": "ตัวเลือก 1", "isCorrect": true, "color": "red", "order": 0},
      {"answerText": "ตัวเลือก 2", "isCorrect": false, "color": "blue", "order": 1},
      {"answerText": "ตัวเลือก 3", "isCorrect": false, "color": "green", "order": 2},
      {"answerText": "ตัวเลือก 4", "isCorrect": false, "color": "yellow", "order": 3}
    ],
    "timeLimit": 20,
    "points": 1000
  }
]

กฎสำคัญ:
1. แต่ละคำถามต้องมี 4 ตัวเลือก
2. มีคำตอบที่ถูกต้องเพียง 1 ข้อ (isCorrect: true)
3. color ต้องเป็น "red", "blue", "green", "yellow" ตามลำดับ
4. timeLimit ควรเป็น 20-30 วินาที
5. points ควรเป็น 1000
6. คำถามและคำตอบต้องเป็นภาษาไทย (ยกเว้นหัวข้อเป็นภาษาอื่น)
7. ห้ามมี markdown หรือ code block ใดๆ ตอบเป็น JSON array ล้วนๆ
8. คำถามต้องไม่ยาวเกิน 100 ตัวอักษร ตัวเลือกไม่ยาวเกิน 50 ตัวอักษร
9. ต้องตอบให้ครบ ${batchCount} ข้อและเป็น JSON ที่ถูกต้องสมบูรณ์`;

        // Fire all batches concurrently
        const batchResults = await Promise.all(
            batches.map((batchCount, batchIndex) =>
                openai.chat.completions.create({
                    model: selectedModel,
                    messages: [{ role: "user", content: buildPrompt(batchCount, batchIndex) }],
                    temperature: 0.7,
                    top_p: 0.9,
                    max_tokens: 2048, // 5 questions fit well within 2048 tokens
                })
            )
        );

        // Try to parse JSON from response
        let questions: GeneratedQuestion[] = [];

        try {
            for (const [i, completion] of batchResults.entries()) {
                const responseText = completion.choices[0]?.message?.content || "";
                const finishReason = completion.choices[0]?.finish_reason;
                console.log(`Batch ${i + 1}/${batches.length} — length: ${responseText.length}, finish: ${finishReason}`);

                const parsed = parseAIResponse(responseText);
                questions.push(...parsed);
            }

            // Validate and fix the questions
            questions = questions.map((q, index) => {
                // Shuffle answers to ensure correct answer isn't always first
                const answers = [...(q.answers || [])];
                for (let i = answers.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [answers[i], answers[j]] = [answers[j], answers[i]];
                }

                return {
                    questionText: q.questionText || `คำถามที่ ${index + 1}`,
                    answers: answers.slice(0, 4).map((a, i) => ({
                        answerText: a.answerText || `ตัวเลือก ${i + 1}`,
                        isCorrect: a.isCorrect === true,
                        color: (["red", "blue", "green", "yellow"] as const)[i],
                        order: i,
                    })),
                    timeLimit: q.timeLimit || 20,
                    points: q.points || 1000,
                };
            });

            // Ensure each question has exactly one correct answer
            questions = questions.map(q => {
                const hasCorrect = q.answers.some(a => a.isCorrect);
                if (!hasCorrect && q.answers.length > 0) {
                    q.answers[0].isCorrect = true;
                }
                return q;
            });

            if (questions.length === 0) {
                throw new Error("No valid questions parsed from AI response");
            }

        } catch (parseError) {
            console.error("Failed to parse AI response:", parseError);
            return NextResponse.json(
                { success: false, error: "AI สร้างคำถามไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                questions,
                topic,
                generatedCount: questions.length,
            },
        });
    } catch (error) {
        console.error("AI Generation Error:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการสร้างคำถาม" },
            { status: 500 }
        );
    }
}

/**
 * Robustly extract a JSON array from the raw AI response text.
 *
 * Handles these common LLM output issues:
 *  1. Markdown code fences  (```json ... ```)
 *  2. Extra prose before/after the JSON array
 *  3. Trailing commas inside objects/arrays
 *  4. Truncated responses — strips the last incomplete object so the
 *     remaining array is still valid JSON and returns what we have.
 */
function parseAIResponse(raw: string): GeneratedQuestion[] {
    let text = raw.trim();

    // ── Step 1: strip markdown code fences ──────────────────────────────────
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    // ── Step 2: isolate first JSON array ────────────────────────────────────
    const startIdx = text.indexOf("[");
    if (startIdx === -1) throw new Error("No JSON array found in AI response");
    let arrayText = text.slice(startIdx);

    // ── Step 3: attempt direct parse ────────────────────────────────────────
    try {
        const parsed = JSON.parse(arrayText);
        if (Array.isArray(parsed)) return parsed;
    } catch { /* fall through */ }

    // ── Step 4: remove trailing commas ──────────────────────────────────────
    const noTrailing = arrayText.replace(/,\s*([}\]])/g, "$1");
    try {
        const parsed = JSON.parse(noTrailing);
        if (Array.isArray(parsed)) return parsed;
    } catch { /* fall through */ }

    // ── Step 5: recovery from truncated response ─────────────────────────────
    // Find the last complete top-level object by scanning for the last `}` and
    // manually closing the array.
    const closingText = noTrailing || arrayText;
    const lastBrace = closingText.lastIndexOf("}");
    if (lastBrace !== -1) {
        // Slice up to and including the last `}`, then close the array
        const recovered = closingText.slice(0, lastBrace + 1).replace(/,\s*$/, "") + "]";
        try {
            const parsed = JSON.parse(recovered);
            if (Array.isArray(parsed) && parsed.length > 0) {
                console.warn(`Truncation recovery: got ${parsed.length} complete question(s).`);
                return parsed;
            }
        } catch { /* fall through */ }
    }

    throw new Error("Could not parse JSON even after all recovery attempts");
}
