import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
    resolveModelChain,
    getClient,
    isReasoningModel,
    noteModelFailure,
    noteModelSuccess,
    type ModelCandidate,
    type ProviderName,
} from "@/lib/ai/model-resolver";
import { areQuestionsSimilar, dedupeQuestions } from "@/lib/ai/question-dedupe";


/**
 * Leave enough budget to try a second provider on Hobby. Free models can spend
 * their whole output allowance on hidden reasoning, so a long per-call timeout
 * makes fallback effectively useless.
 */
const PER_CALL_TIMEOUT_MS = 35_000;

/** Don't start a model call we cannot finish, plus room to build the response. */
const MIN_CALL_MS = 6_000;

/**
 * Function-level limit. This OVERRIDES the project default configured in
 * Vercel → Settings → Functions, so raising that project default alone does
 * nothing — change this line too.
 *
 * Keep this in sync with Vercel → Settings → Functions. Vercel's current
 * Hobby limit is 300 seconds when Fluid Compute is enabled.
 *
 * This is the platform ceiling, not the target: `GENERATION_BUDGET_MS` below
 * keeps a single request far away from it. The client asks for another round
 * when a round comes back short, which is what makes a 15-question request
 * finish even though no single invocation may live longer than 300 seconds.
 */
export const maxDuration = 300;

/** Keep time free for cold starts, catalog discovery and serialisation. */
const HEADROOM_S = 30;

/**
 * Time one request may spend working through the model chain.
 *
 * A function that outlives `maxDuration` is killed by the platform, which then
 * answers with a plain-text 504 page the client cannot parse, so the budget is
 * capped just under the function limit. It is also kept well below that limit
 * on purpose: a request that returns on time can hand its partial result to
 * the next round, while a request that is killed loses everything it found.
 *
 * Raise AI_GENERATION_BUDGET_MS (in ms) to let slow models try for longer —
 * the ceiling follows `maxDuration` automatically.
 */
const GENERATION_BUDGET_MS = (() => {
    const hardCap = (maxDuration - HEADROOM_S) * 1000;
    const configured = Number(process.env.AI_GENERATION_BUDGET_MS);
    if (!Number.isFinite(configured) || configured <= 0) {
        return Math.min(110_000, hardCap);
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
    provider,
    model,
    topic,
    difficulty,
    batchCount,
    existingQuestions,
    batchNumber,
    timeoutMs,
}: {
    client: OpenAI;
    provider: ProviderName;
    model: string;
    topic: string;
    difficulty: string;
    batchCount: number;
    existingQuestions: string[];
    batchNumber: number;
    timeoutMs: number;
}): Promise<GeneratedQuizContent> {
    const SYSTEM_PROMPT = `You are a quiz content generator. You MUST respond with ONLY one valid JSON object and nothing else.
No markdown, no code fences, no explanation, and no prose outside the JSON.
Create a concise Thai title and description that summarize the actual quiz content; never copy the user's prompt verbatim.
If asked to generate N questions, the questions array must have exactly N elements.`;

    const existingList = existingQuestions || [];
    const avoidSection = existingList.length > 0
        ? `\n\nIMPORTANT - These questions already exist. DO NOT repeat them, and DO NOT ask the same thing with different wording:\n${existingList.slice(-30).map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nRewording an existing question, reordering its choices, or asking about the same fact from the same angle still counts as a repeat. Every new question must test a DIFFERENT fact.`
        : "";

    // A malformed/empty response is a model failure. Trying another model is
    // both faster and more useful than asking the same free model again.
    const userPrompt = `Generate ${batchCount} quiz questions about: "${topic}"
Difficulty: ${difficulty}${avoidSection}

Output ONLY this JSON object structure (no other text):
{
  "title": "ชื่อแบบทดสอบภาษาไทยที่กระชับ ไม่เกิน 80 ตัวอักษร",
  "description": "คำอธิบายเนื้อหาแบบทดสอบภาษาไทย 1-2 ประโยค ไม่เกิน 300 ตัวอักษร",
  "questions": [
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
}

Rules:
- Exactly 4 answers per question
- Exactly 1 answer with isCorrect: true
- Colors must be exactly: "red","blue","green","yellow" in order
- Questions and answers must be in Thai language
- Return EXACTLY ${batchCount} questions
- Each question must be UNIQUE and test a completely different fact
- Never reword an existing question, and never ask the same fact from another angle
- Write a natural title and description based on the quiz content, not by copying the prompt
- Do not include Markdown symbols such as #, *, or backticks in title or description
- Output one raw JSON object ONLY - no markdown, no explanation`;

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), timeoutMs);
    let completion;

    // Free reasoning models can burn the whole output allowance on hidden
    // thinking and answer with nothing usable, so the switch is sent for them.
    // OpenRouter rejects it on endpoints where reasoning is mandatory, hence
    // the retry below; other providers reject unknown parameters entirely, so
    // it is scoped to OpenRouter in the first place.
    const wantsReasoningOff = provider === "openrouter" && isReasoningModel(model);

    const requestBody = (disableReasoning: boolean) => ({
        model,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        // Generate the requested quiz in one response. The allowance scales
        // with the question count while retaining a ceiling for providers that
        // expose very large context windows.
        max_tokens: Math.min(64_000, Math.max(4_000, batchCount * 800)),
        ...(disableReasoning ? { reasoning: { enabled: false } } : {}),
    }) as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

    try {
        try {
            completion = await client.chat.completions.create(requestBody(wantsReasoningOff), {
                timeout: timeoutMs,
                signal: controller.signal,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (!wantsReasoningOff || !/reasoning/i.test(message)) throw error;

            console.warn(`[AI] ${model}: reasoning cannot be disabled, retrying anyway — ${message}`);
            completion = await client.chat.completions.create(requestBody(false), {
                timeout: timeoutMs,
                signal: controller.signal,
            });
        }
    } finally {
        clearTimeout(abortTimer);
    }

        const rawContent = completion.choices[0]?.message?.content;
        const responseText = sanitizeAIResponse(
            Array.isArray(rawContent)
                ? rawContent.map((part) => typeof part === "string" ? part : ("text" in part ? part.text ?? "" : "")).join("")
                : rawContent || ""
        );
        const finishReason = completion.choices[0]?.finish_reason;

    console.log(
        `[AI batch ${batchNumber}] provider=${provider} model=${model} requested=${batchCount} length=${responseText.length} finish=${finishReason}`
    );

    if (!responseText) {
        throw new EmptyAIResponseError();
    }

    // `length` means the model ran out of output allowance mid-answer. The
    // questions before the cut are still good, so they are recovered instead
    // of thrown away — a short batch is topped up by the next one.
    const truncated = finishReason === "length" && !responseText.trim().endsWith("]");

    try {
        const parsed = parseAIResponse(responseText);
        const normalized = normalizeQuestions(parsed.questions);

        if (normalized.length === 0) {
            throw new Error("PARSE_FAILED: No valid questions parsed from AI response");
        }

        if (truncated) {
            console.warn(
                `[AI batch ${batchNumber}] ${model} hit the output limit — recovered ${normalized.length}/${batchCount} questions`
            );
        }

        return {
            questions: normalized,
            title: parsed.title,
            description: parsed.description,
        };
    } catch (parseError) {
        console.error(`[AI batch ${batchNumber}] Failed to parse AI response:`, parseError);
        if (truncated) throw new TruncatedAIResponseError();
        throw parseError;
    }
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

interface GeneratedQuizContent {
    questions: GeneratedQuestion[];
    title?: string;
    description?: string;
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
}): Promise<GeneratedQuizContent> {
    const client = getClient(candidate.provider);
    const collected: GeneratedQuestion[] = [...alreadyGenerated];
    const existingQuestionRefs = existingQuestions.map((questionText) => ({ questionText }));

    let title: string | undefined;
    let description: string | undefined;
    let consecutiveNoProgress = 0;

    // The first call generates the quiz in one shot. If deduplication removes
    // anything, ask the same model only for the missing questions before
    // falling back to another provider.
    for (let attempt = 1; attempt <= 4 && collected.length < totalTarget; attempt++) {
        const remaining = deadline - Date.now();
        if (remaining < MIN_CALL_MS) break;

        const requestedCount = totalTarget - collected.length;
        let generatedContent: GeneratedQuizContent;

        try {
            generatedContent = await generateBatch({
                client,
                provider: candidate.provider,
                model: candidate.id,
                topic,
                difficulty,
                batchCount: requestedCount,
                existingQuestions: [
                    ...existingQuestions,
                    ...collected.map((question) => question.questionText),
                ],
                batchNumber: attempt,
                timeoutMs: Math.min(remaining, PER_CALL_TIMEOUT_MS),
            });
        } catch (error) {
            if (collected.length === alreadyGenerated.length) throw error;
            console.warn(
                `[AI] ${candidate.provider}:${candidate.id} stopped after partial progress — ${(error as Error).message}`
            );
            break;
        }

        title ||= generatedContent.title;
        description ||= generatedContent.description;

        const before = collected.length;
        const acceptedQuestions = generatedContent.questions.filter(
            (question) =>
                !existingQuestionRefs.some((existing) => areQuestionsSimilar(existing, question)) &&
                !collected.some((existing) => areQuestionsSimilar(existing, question))
        );

        collected.push(...acceptedQuestions);

        const uniqueQuestions = dedupeQuestions(collected);
        collected.length = 0;
        collected.push(...uniqueQuestions.slice(0, totalTarget));

        const added = collected.length - before;
        console.log(
            `[AI result ${attempt}] provider=${candidate.provider} model=${candidate.id} requested=${requestedCount} accepted=${added}/${generatedContent.questions.length} total=${collected.length}/${totalTarget}`
        );

        if (added === 0) {
            consecutiveNoProgress++;
            if (consecutiveNoProgress >= 2) break;
        } else {
            consecutiveNoProgress = 0;
        }
    }

    return { questions: collected, title, description };
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
        return `AI Provider ปฏิเสธการเชื่อมต่อทุกโมเดล (${failures.length} โมเดล) — ตรวจสอบ API Key ของ Gemini / OpenRouter / NVIDIA / Groq / Cerebras / Mistral`;
    }

    if (failures.every((f) => f.status === 429)) {
        return "AI ทุกตัวถูกเรียกใช้งานหนักเกินไปในขณะนี้ — กรุณาลองใหม่อีกครั้งในอีกสักครู่";
    }

    return `สร้างคำถามไม่สำเร็จ — ลองแล้ว ${failures.length} โมเดลจากทุก Provider กรุณาลองใหม่อีกครั้ง หรือเพิ่ม API Key ของ Provider อื่นใน Environment Variables`;
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

        // Questions the client already holds from earlier rounds. Passing them
        // back in is what lets a short round be topped up without repeats.
        const seedExistingQuestions = (Array.isArray(existingQuestions) ? existingQuestions : [])
            .filter((question): question is string => typeof question === "string")
            .map((question) => question.trim())
            .filter(Boolean);

        // No model is pinned — the chain is read live from the providers.
        const chain = await resolveModelChain();

        if (chain.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "ไม่พบ AI Model ที่พร้อมใช้งาน — กรุณาตรวจสอบ API Key ของ Gemini / OpenRouter / NVIDIA / Groq / Cerebras / Mistral",
                },
                { status: 503 }
            );
        }

        const failures: ModelFailure[] = [];

        let questions: GeneratedQuestion[] = [];
        let generatedTitle: string | undefined;
        let generatedDescription: string | undefined;
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

                if (generated.questions.length > questions.length) {
                    questions = generated.questions;
                    generatedTitle ||= generated.title;
                    generatedDescription ||= generated.description;
                    usedCandidate = candidate;
                    noteModelSuccess(candidate);
                } else {
                    // The model answered without adding anything new. Bench it
                    // briefly so the next round does not pay for it again.
                    console.warn(
                        `[AI] ${candidate.provider}:${candidate.id} added no unique questions; trying the next candidate`
                    );
                    noteModelFailure(candidate, "model returned no new questions");
                }
            } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                console.error(`[AI] ${candidate.provider}:${candidate.id} failed — ${reason}`);
                failures.push({
                    model: candidate.id,
                    reason,
                    status: (error as { status?: number }).status,
                });
                noteModelFailure(candidate, reason);
            }
        }

        if (questions.length === 0) {
            return NextResponse.json(
                { success: false, error: describeFailure(failures) },
                { status: 502 }
            );
        }

        // `complete` and `remaining` are what the client checks before asking
        // for another round: a short answer is never presented as a finished one.
        const remaining = Math.max(0, totalTarget - questions.length);

        return NextResponse.json({
            success: true,
            data: {
                questions,
                topic,
                title: generatedTitle,
                description: generatedDescription,
                requested: totalTarget,
                generatedCount: questions.length,
                complete: remaining === 0,
                remaining,
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
function cleanGeneratedMetadata(value: unknown, maxLength: number): string | undefined {
    if (typeof value !== "string") return undefined;
    const cleaned = value.replace(/[*#`]/g, "").replace(/\s+/g, " ").trim();
    return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function parseAIResponse(raw: string): GeneratedQuizContent {
    const text = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();

    try {
        const parsed = JSON.parse(text.replace(/,\s*([}\]])/g, "$1"));
        if (parsed && typeof parsed === "object" && Array.isArray(parsed.questions)) {
            return {
                questions: parsed.questions as GeneratedQuestion[],
                title: cleanGeneratedMetadata(parsed.title, 100),
                description: cleanGeneratedMetadata(parsed.description, 500),
            };
        }
    } catch {
        // Fall back to the tolerant array recovery below.
    }

    return { questions: parseQuestionsFromAIResponse(text) };
}

function parseQuestionsFromAIResponse(raw: string): GeneratedQuestion[] {
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
