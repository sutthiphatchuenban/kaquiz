import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { resolveModelChain, getClient, type ModelCandidate } from "@/lib/ai/model-resolver";
import { dedupeQuestions } from "@/lib/ai/question-dedupe";

const MAX_QUESTIONS_PER_BATCH = 10;
const MAX_PARSE_RETRIES = 2;

/** Hard cap for a single model call so one slow model cannot stall the chain. */
const PER_CALL_TIMEOUT_MS = 25_000;

/** Don't start a model call we cannot finish, plus room to build the response. */
const MIN_CALL_MS = 6_000;

/**
 * Function-level limit. This OVERRIDES the project default configured in
 * Vercel → Settings → Functions, so raising that project default alone does
 * nothing — change this line too.
 *
 * 60s is the Hobby plan ceiling; Pro and Enterprise allow up to 30 minutes.
 */
export const maxDuration = 60;

/** Keep this many seconds of `maxDuration` free for cold starts + serialisation. */
const HEADROOM_S = 15;

/**
 * Total time the request may spend working through the model chain.
 *
 * A function that outlives `maxDuration` is killed by the platform, which then
 * answers with a plain-text 504 page the client cannot parse, so the budget is
 * capped just under the function limit.
 *
 * Raise AI_GENERATION_BUDGET_MS (in ms) to let slow models try for longer —
 * the ceiling follows `maxDuration` automatically.
 */
const GENERATION_BUDGET_MS = (() => {
    const hardCap = (maxDuration - HEADROOM_S) * 1000;
    const configured = Number(process.env.AI_GENERATION_BUDGET_MS);
    if (!Number.isFinite(configured) || configured <= 0) {
        return Math.min(45_000, hardCap);
    }
    return Math.min(Math.max(configured, 5_000), hardCap);
})();


class EmptyAIResponseError extends Error {
    constructor(message = "AI returned empty content") {
        super(message);
        this.name = "EmptyAIResponseError";
    }
}

class TruncatedAIResponseError extends Error {
    constructor(message = "AI response was truncated") {
        super(message);
        this.name = "TruncatedAIResponseError";
    }
}


function sanitizeAIResponse(raw: string): string {
    let responseText = raw;

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

    return responseText.trim();
}

function normalizeQuestions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
    return questions.map((q, index) => {
        const answers = [...(q.answers || [])];
        for (let i = answers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [answers[i], answers[j]] = [answers[j], answers[i]];
        }

        const normalizedAnswers = answers.slice(0, 4).map((a, i) => ({
            answerText: a.answerText || `ตัวเลือก ${i + 1}`,
            isCorrect: a.isCorrect === true,
            color: (["red", "blue", "green", "yellow"] as const)[i],
            order: i,
        }));

        if (normalizedAnswers.length > 0 && !normalizedAnswers.some((a) => a.isCorrect)) {
            normalizedAnswers[0].isCorrect = true;
        }

        return {
            questionText: q.questionText || `คำถามที่ ${index + 1}`,
            answers: normalizedAnswers,
            timeLimit: q.timeLimit || 20,
            points: q.points || 1000,
        };
    });
}



async function generateBatch({
    client,
    model,
    topic,
    difficulty,
    batchCount,
    existingQuestions,
    batchNumber,
    timeoutMs,
    deadline,
}: {
    client: OpenAI;
    model: string;
    topic: string;
    difficulty: string;
    batchCount: number;
    existingQuestions: string[];
    batchNumber: number;
    timeoutMs: number;
    deadline: number;
}): Promise<GeneratedQuestion[]> {
    const SYSTEM_PROMPT = `You are a quiz question generator. You MUST respond with ONLY a valid JSON array and nothing else.
No markdown, no code fences, no explanation, no prose. Just a raw JSON array starting with [ and ending with ].
If asked to generate N questions, the array must have exactly N elements.`;

    const existingList = existingQuestions || [];
    const avoidSection = existingList.length > 0
        ? `\n\nIMPORTANT - These questions already exist. DO NOT repeat them, and DO NOT ask the same thing with different wording:\n${existingList.slice(-30).map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nRewording an existing question, reordering its choices, or asking about the same fact from the same angle still counts as a repeat. Every new question must test a DIFFERENT fact.`
        : "";

    for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt++) {
        // Out of time: failing fast beats having the platform kill the request.
        if (Date.now() + 1_000 >= deadline) {
            throw new Error("Generation deadline reached before retrying");
        }

        const stricterInstruction = attempt > 0
            ? `\n\nCRITICAL: Return minified JSON only. Do not include any explanation, prefix, suffix, thinking text, or markdown. If you cannot comply, return [] only.`
            : "";

        const userPrompt = `Generate ${batchCount} quiz questions about: "${topic}"
Difficulty: ${difficulty}${avoidSection}

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
- Return EXACTLY ${batchCount} questions
- Each question must be UNIQUE and test a completely different fact
- Never reword an existing question, and never ask the same fact from another angle
- Output raw JSON array ONLY - no markdown, no explanation${stricterInstruction}`;

        const completion = await client.chat.completions.create(
            {
                model,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userPrompt },
                ],
                temperature: attempt > 0 ? 0.2 : 0.3,
                max_tokens: 12000,
            },
            // Never let one call outlive what is left of the request budget.
            { timeout: timeoutMs }
        );

        const rawContent = completion.choices[0]?.message?.content;
        const responseText = sanitizeAIResponse(
            Array.isArray(rawContent)
                ? rawContent.map((part) => typeof part === "string" ? part : ("text" in part ? part.text ?? "" : "")).join("")
                : rawContent || ""
        );
        const finishReason = completion.choices[0]?.finish_reason;

        console.log(
            `[AI batch ${batchNumber} attempt ${attempt + 1}] model=${model} count=${batchCount} length=${responseText.length} finish=${finishReason}`
        );

        if (!responseText) {
            if (attempt === MAX_PARSE_RETRIES) {
                throw new EmptyAIResponseError();
            }
            continue;
        }

        if (finishReason === "length" && !responseText.trim().endsWith("]")) {
            if (attempt === MAX_PARSE_RETRIES) {
                throw new TruncatedAIResponseError();
            }
            continue;
        }

        try {
            const parsed = parseAIResponse(responseText);
            const normalized = normalizeQuestions(parsed);

            if (normalized.length === 0) {
                throw new Error("PARSE_FAILED: No valid questions parsed from AI response");
            }

            return normalized;
        } catch (parseError) {
            console.error(`[AI batch ${batchNumber} attempt ${attempt + 1}] Failed to parse AI response:`, parseError);
            if (attempt === MAX_PARSE_RETRIES) {
                throw parseError;
            }
        }
    }

    throw new Error("AI batch generation failed after retries");
}



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

interface ModelFailure {
    model: string;
    reason: string;
    status?: number;
}

/**
 * Generates with one model until the target is reached, mixing in anything
 * produced by earlier models so a fallback model does not repeat them.
 */
async function generateUpToTarget({
    candidate,
    topic,
    difficulty,
    totalTarget,
    existingQuestions,
    alreadyGenerated,
    deadline,
}: {
    candidate: ModelCandidate;
    topic: string;
    difficulty: string;
    totalTarget: number;
    existingQuestions: string[];
    alreadyGenerated: GeneratedQuestion[];
    deadline: number;
}): Promise<GeneratedQuestion[]> {
    const client = getClient(candidate.provider);
    const collected: GeneratedQuestion[] = [...alreadyGenerated];

    // Bounds the loop in case a model keeps returning duplicates.
    const maxBatches =
        Math.ceil((totalTarget - alreadyGenerated.length) / MAX_QUESTIONS_PER_BATCH) + 3;

    for (let batch = 0; batch < maxBatches && collected.length < totalTarget; batch++) {
        const remaining = deadline - Date.now();
        if (remaining < MIN_CALL_MS) break;

        const batchCount = Math.min(totalTarget - collected.length, MAX_QUESTIONS_PER_BATCH);

        let batchQuestions: GeneratedQuestion[];
        try {
            batchQuestions = await generateBatch({
                client,
                model: candidate.id,
                topic,
                difficulty,
                batchCount,
                existingQuestions: [
                    ...existingQuestions,
                    ...collected.map((q) => q.questionText),
                ],
                batchNumber: batch + 1,
                timeoutMs: Math.min(remaining, PER_CALL_TIMEOUT_MS),
                deadline,
            });
        } catch (error) {
            // A slow extra batch must not throw away questions this model
            // already produced. Re-throw only when it produced nothing, so the
            // chain moves on to the next model.
            if (collected.length > alreadyGenerated.length) {
                console.warn(
                    `[AI] ${candidate.id}: stopping early — ${(error as Error).message}`
                );
                break;
            }
            throw error;
        }

        collected.push(...batchQuestions);

        const uniqueQuestions = dedupeQuestions(collected);
        collected.length = 0;
        collected.push(...uniqueQuestions.slice(0, totalTarget));
    }

    return collected;
}

/**
 * Explains why every model failed. When all failures were refused by the
 * provider (bad key, no entitlement, or a catalog entry that is no longer
 * served) the API keys are the problem, not the prompt or the topic.
 */
function describeFailure(failures: ModelFailure[]): string {
    if (failures.length === 0) {
        return "ไม่สามารถสร้างคำถามได้ — กรุณาลองใหม่อีกครั้ง";
    }

    // Slow models and exhausted budgets are the most common cause, and the
    // user can act on it (fewer questions, or simply try again).
    const looksLikeTimeout = (f: ModelFailure) =>
        /timed? ?out|timeout|aborted|deadline|budget/i.test(f.reason);
    if (failures.every(looksLikeTimeout)) {
        return "AI ตอบสนองช้ากว่าเวลาที่กำหนด — ลองลดจำนวนคำถามลง หรือกดสร้างใหม่อีกครั้ง";
    }

    // 404/410 mean the catalog advertised a model the provider will not serve.
    const providerRejectStatuses = new Set([401, 402, 403, 404, 410]);
    if (failures.every((f) => f.status !== undefined && providerRejectStatuses.has(f.status))) {
        return "AI Provider ปฏิเสธการเชื่อมต่อทุกโมเดล (API Key ไม่ถูกต้อง/หมดสิทธิ์) — กรุณาตรวจสอบ OPENROUTER_API_KEY และ NVIDIA_API_KEY";
    }

    if (failures.every((f) => f.status === 429)) {
        return "AI ทุกตัวถูกเรียกใช้งานหนักเกินไปในขณะนี้ — กรุณาลองใหม่อีกครั้งในอีกสักครู่";
    }

    return `สร้างคำถามไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง (ลองแล้ว ${failures.length} โมเดล)`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { topic, count, difficulty = "medium", existingQuestions = [] } = body;

        if (!topic || !count) {
            return NextResponse.json(
                { success: false, error: "กรุณากรอกหัวข้อและจำนวนคำถาม" },
                { status: 400 }
            );
        }

        const totalTarget = Math.min(Math.max(parseInt(count.toString() || "5"), 1), 50);

        // Started before the catalog is read, so listing models also counts
        // against the request budget.
        const deadline = Date.now() + GENERATION_BUDGET_MS;

        // No model is pinned — the chain is read live from the providers.
        const chain = await resolveModelChain();

        if (chain.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "ไม่พบ AI Model ที่พร้อมใช้งาน — กรุณาตรวจสอบ API Key ของ OpenRouter / NVIDIA",
                },
                { status: 503 }
            );
        }

        const seedExistingQuestions = (existingQuestions as string[]) || [];
        const failures: ModelFailure[] = [];

        let questions: GeneratedQuestion[] = [];
        let usedCandidate: ModelCandidate | null = null;

        for (const candidate of chain) {
            if (questions.length >= totalTarget) break;

            const remaining = deadline - Date.now();
            if (remaining < MIN_CALL_MS) {
                failures.push({ model: candidate.id, reason: "generation budget exhausted" });
                break;
            }

            try {
                const generated = await generateUpToTarget({
                    candidate,
                    topic,
                    difficulty,
                    totalTarget,
                    existingQuestions: seedExistingQuestions,
                    alreadyGenerated: questions,
                    deadline,
                });

                if (generated.length > questions.length) {
                    questions = generated;
                    usedCandidate = candidate;
                }
            } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                console.error(`[AI] ${candidate.provider}:${candidate.id} failed — ${reason}`);
                failures.push({
                    model: candidate.id,
                    reason,
                    status: (error as { status?: number }).status,
                });
            }
        }

        if (questions.length === 0) {
            return NextResponse.json(
                { success: false, error: describeFailure(failures) },
                { status: 502 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                questions,
                topic,
                generatedCount: questions.length,
                model: usedCandidate?.id,
                provider: usedCandidate?.provider,
                fallbacksUsed: failures.length,
            },
        });
    } catch (error) {
        console.error("AI Generation Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "เกิดข้อผิดพลาดในการสร้างคำถาม — กรุณาลองใหม่อีกครั้ง",
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

    if (!text) {
        throw new EmptyAIResponseError();
    }

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
        const objects: GeneratedQuestion[] = [];
        const regex = /{[^{}]*}/g; // Very simple object matcher
        let m;
        while ((m = regex.exec(text)) !== null) {
            try {
                const obj = JSON.parse(m[0]) as Partial<GeneratedQuestion>;
                if (obj.questionText) objects.push(obj as GeneratedQuestion);
            } catch { /* ignore */ }
        }
        if (objects.length > 0) return objects;
    }

    throw new Error("Could not parse JSON even after all recovery attempts");
}
