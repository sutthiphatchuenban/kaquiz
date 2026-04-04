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
        const { topic, count, difficulty = "medium", model = "gpt-oss-20b", existingQuestions = [] } = body;

        if (!topic || !count) {
            return NextResponse.json(
                { success: false, error: "กรุณากรอกหัวข้อและจำนวนคำถาม" },
                { status: 400 }
            );
        }

        const totalTarget = Math.min(Math.max(parseInt(count.toString() || "5"), 1), 50);

        // Map model selection to NVIDIA NIM model IDs
        const modelMap: Record<string, string> = {
            "mistral-small-4": "mistralai/mistral-small-4-119b-2603",
            "gpt-oss-120b": "openai/gpt-oss-120b",
            "gpt-oss-20b": "openai/gpt-oss-20b",
            "gemma-3n": "google/gemma-3n-e4b-it",
        };

        const selectedModel = modelMap[model] || "openai/gpt-oss-20b";

        const SYSTEM_PROMPT = `You are a quiz question generator. You MUST respond with ONLY a valid JSON array and nothing else.
No markdown, no code fences, no explanation, no prose. Just a raw JSON array starting with [ and ending with ].
If asked to generate N questions, the array must have exactly N elements.`;

        const userPrompt = `Generate ${totalTarget} quiz questions about: "${topic}"
Difficulty: ${difficulty}

Output ONLY this JSON array structure (no other text):
[
  {
    "questionText": "คำถาม (ภาษาไทย, ไม่เกิน 100 ตัวอักษร)",
    "answers": [
      {"answerText": "ตัวเลือก 1 (ไม่เกิน 50 ตัวอักษร)", "isCorrect": true, "color": "red", "order": 0},
      {"answerText": "ตัวเลือก 2", "isCorrect": false, "color": "blue", "order": 1},
      {"answerText": "ตัวเลือก 3", "isCorrect": false, "color": "green", "order": 2},
      {"answerText": "ตัวเลือก 4", "isCorrect": false, "color": "yellow", "order": 3}
    ],
    "timeLimit": 20,
    "points": 1000
  }
]

Rules:
- Exactly 4 answers per question
- Exactly 1 answer with isCorrect: true
- Colors must be exactly: "red","blue","green","yellow" in order
- Questions and answers must be in Thai language
- Return EXACTLY ${totalTarget} questions
- Each question must be UNIQUE and different from all others
- Output raw JSON array ONLY - no markdown, no backticks, no explanation`;

        // Single API call
        const completion = await openai.chat.completions.create({
            model: selectedModel,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            top_p: 0.7,
            max_tokens: 8192,
        });

        // Try to parse JSON from response
        let questions: GeneratedQuestion[] = [];

        try {
            let responseText = completion.choices[0]?.message?.content || "";
            const finishReason = completion.choices[0]?.finish_reason;
            console.log(`Response — length: ${responseText.length}, finish: ${finishReason}`);

            // Strip Thinking/Reasoning tags (e.g. <think>...</think>)
            responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, "");
            responseText = responseText.replace(/thinking:[\s\S]*?(?=({|\[))/gi, "");

            // Repair common LLM hallucinations in JSON
            responseText = responseText
                .replace(/"order"\s*:\s*:\s*(\d+)/g, '"order": $1')
                .replace(/"order"\s*:\s*(\d+)\s+(\d+)/g, '"order": $1')
                .replace(/"orde\s*er"\s*:/g, '"order":')
                .replace(/"isCorre\s*ct"\s*:/g, '"isCorrect":')
                .replace(/"answerTe\s*xt"\s*:/g, '"answerText":');

            const parsed = parseAIResponse(responseText);
            questions.push(...parsed);

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
                throw new Error("PARSE_FAILED: No valid questions parsed from AI response");
            }

        } catch (parseError) {
            console.error("Failed to parse AI response:", parseError);
            return NextResponse.json(
                {
                    success: false,
                    error: "AI ตอบกลับไม่ถูกรูปแบบ — ลองเปลี่ยน Model แล้วสร้างใหม่อีกครั้ง",
                    hint: "change_model",
                },
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
        const errMsg = error instanceof Error ? error.message : "";
        const isRateLimit = errMsg.includes("429") || errMsg.includes("rate");
        return NextResponse.json(
            {
                success: false,
                error: isRateLimit
                    ? "Model นี้ถูกใช้งานหนักเกินไป — ลองเปลี่ยนเป็น Model อื่น"
                    : "เกิดข้อผิดพลาดในการสร้างคำถาม — ลองเปลี่ยน Model แล้วลองใหม่",
                hint: "change_model",
            },
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
 *  4. Wrapped object: { "questions": [...] }
 *  5. Truncated responses — strips the last incomplete object so the
 *     remaining array is still valid JSON and returns what we have.
 */
function parseAIResponse(raw: string): GeneratedQuestion[] {
    let text = raw.trim();

    // ── Step 1: strip markdown code fences ──────────────────────────────────
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    // ── Helper: remove trailing commas ──────────────────────────────────────
    const cleanTrailing = (s: string) => s.replace(/,\s*([}\]])/g, "$1");

    // ── Helper: try to parse and return array ────────────────────────────────
    const tryParse = (s: string): GeneratedQuestion[] | null => {
        try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) return parsed;
            // Handle { questions: [...] } or any object wrapping an array
            if (parsed && typeof parsed === "object") {
                for (const val of Object.values(parsed)) {
                    if (Array.isArray(val) && (val as unknown[]).length > 0) {
                        return val as GeneratedQuestion[];
                    }
                }
            }
        } catch { /* fall through */ }
        return null;
    };

    // ── Step 2: try full text directly ──────────────────────────────────────
    let result = tryParse(text) ?? tryParse(cleanTrailing(text));
    if (result) return result;

    // ── Step 3: bracket-match to find the JSON array ─────────────────────────
    const startIdx = text.indexOf("[");
    if (startIdx !== -1) {
        // Walk forward counting brackets to find the matching ]
        let depth = 0;
        let endIdx = -1;
        for (let i = startIdx; i < text.length; i++) {
            if (text[i] === "[") depth++;
            else if (text[i] === "]") {
                depth--;
                if (depth === 0) { endIdx = i; break; }
            }
        }

        if (endIdx !== -1) {
            const arrayText = text.slice(startIdx, endIdx + 1);
            result = tryParse(arrayText) ?? tryParse(cleanTrailing(arrayText));
            if (result) return result;
        }

        // ── Step 4: recovery from truncated response ─────────────────────────
        const arrayText = text.slice(startIdx);
        const noTrailing = cleanTrailing(arrayText);
        
        // Find the last completely closed object '}'
        const lastBrace = noTrailing.lastIndexOf("}");
        if (lastBrace !== -1) {
            try {
                const recovered = noTrailing.slice(0, lastBrace + 1);
                // Remove potential trailing comma before closing array
                const fixed = recovered.replace(/,\s*$/, "") + "]";
                result = tryParse(fixed);
                if (result) return result;
            } catch { /* ignore */ }
        }

        // ── Step 5: final attempt - just try to find ANY valid json objects ───
        const objects: any[] = [];
        const regex = /{[^{}]*}/g; // Very simple object matcher
        let m;
        while ((m = regex.exec(text)) !== null) {
            try {
                const obj = JSON.parse(m[0]);
                if (obj.questionText) objects.push(obj);
            } catch { /* ignore */ }
        }
        if (objects.length > 0) return objects;
    }

    throw new Error("Could not parse JSON even after all recovery attempts");
}
