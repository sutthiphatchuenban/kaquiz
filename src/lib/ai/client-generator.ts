import { readApiResponse } from "@/lib/api-response";
import { dedupeQuestions } from "@/lib/ai/question-dedupe";

/**
 * Drives AI quiz generation from the browser.
 *
 * One HTTP request is bounded by the platform's function limit (Vercel kills a
 * function that outlives `maxDuration`, and the client then receives a
 * plain-text error page instead of JSON). Instead of trying to fit a whole
 * 15-question request into that window, the server answers with as much as it
 * managed and reports what is missing; this module then simply asks again for
 * the remainder, handing back the questions it already has so the model does
 * not repeat them. Generation therefore continues until the count is complete
 * rather than stopping at whatever the first request happened to produce.
 */

export interface GeneratedAnswer {
    answerText: string;
    isCorrect: boolean;
    color: "red" | "blue" | "green" | "yellow";
    order: number;
}

export interface GeneratedQuestion {
    questionText: string;
    answers: GeneratedAnswer[];
    timeLimit: number;
    points: number;
}

export interface GenerationProgress {
    done: number;
    target: number;
    round: number;
    maxRounds: number;
}

export interface GenerationResult {
    questions: GeneratedQuestion[];
    /** True when the AI produced every question that was asked for. */
    complete: boolean;
    rounds: number;
    models: string[];
    title?: string;
    description?: string;
    /** Reason the run stopped short, when it did. */
    error?: string;
}

export const MAX_GENERATION_ROUNDS = 6;

/**
 * Two rounds in a row that add nothing mean the remaining budget would be
 * wasted: every provider was already tried for this round's questions.
 */
const MAX_ROUNDS_WITHOUT_PROGRESS = 2;

/** Safety valve so a slow provider chain cannot keep the page busy forever. */
const TOTAL_TIME_LIMIT_MS = 9 * 60 * 1000;

const MAX_QUESTIONS = 50;

const ENDPOINT = "/api/ai/generate-questions";

/** The subset of the API payload this module relies on. */
interface GeneratePayload {
    questions?: GeneratedQuestion[];
    remaining?: number;
    model?: string;
    title?: string;
    description?: string;
}

export async function generateQuestionsUntilComplete({
    topic,
    difficulty,
    target,
    existingQuestions = [],
    sourceText,
    onProgress,
}: {
    topic: string;
    difficulty: string;
    target: number;
    /** Questions that already exist, e.g. when the user asks for more. */
    existingQuestions?: GeneratedQuestion[];
    /** Optional pasted exam / source document the AI must base questions on. */
    sourceText?: string;
    onProgress?: (progress: GenerationProgress) => void;
}): Promise<GenerationResult> {
    const goal = Math.min(Math.max(Math.floor(target) || 1, 1), MAX_QUESTIONS);
    let collected = dedupeQuestions([...existingQuestions]).slice(0, goal);

    const startedAt = Date.now();
    const models = new Set<string>();
    let rounds = 0;
    let roundsWithoutProgress = 0;
    let error: string | undefined;
    let generatedTitle: string | undefined;
    let generatedDescription: string | undefined;

    while (collected.length < goal && rounds < MAX_GENERATION_ROUNDS) {
        if (Date.now() - startedAt > TOTAL_TIME_LIMIT_MS) {
            error = "ใช้เวลาสร้างนานเกินกำหนด";
            break;
        }

        rounds += 1;
        onProgress?.({
            done: collected.length,
            target: goal,
            round: rounds,
            maxRounds: MAX_GENERATION_ROUNDS,
        });

        let payload: GeneratePayload | null = null;
        let failure: string | undefined;

        try {
            const res = await fetch(ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic,
                    difficulty,
                    count: goal - collected.length,
                    existingQuestions: collected.map((question) => question.questionText),
                    ...(sourceText?.trim() ? { sourceText: sourceText.trim() } : {}),
                }),
            });

            const data = await readApiResponse<GeneratePayload>(res);
            if (data.success && data.data) {
                payload = data.data;
            } else {
                failure = data.error || "สร้างคำถามไม่สำเร็จ";
            }
        } catch (networkError) {
            failure =
                networkError instanceof Error
                    ? networkError.message
                    : "เชื่อมต่อ AI ไม่สำเร็จ";
        }

        if (!payload) {
            error = failure;
            roundsWithoutProgress += 1;
            if (roundsWithoutProgress >= MAX_ROUNDS_WITHOUT_PROGRESS) break;
            continue;
        }

        if (payload.model) models.add(payload.model);
        generatedTitle ||= payload.title;
        generatedDescription ||= payload.description;

        const before = collected.length;
        if (payload.questions?.length) {
            collected = dedupeQuestions([...collected, ...payload.questions]).slice(0, goal);
        }

        onProgress?.({
            done: collected.length,
            target: goal,
            round: rounds,
            maxRounds: MAX_GENERATION_ROUNDS,
        });

        if (collected.length === before) {
            roundsWithoutProgress += 1;
            error = `AI ยังสร้างคำถามเพิ่มไม่ได้ (ยังขาดอีก ${goal - before} ข้อ)`;
            if (roundsWithoutProgress >= MAX_ROUNDS_WITHOUT_PROGRESS) break;
            continue;
        }

        roundsWithoutProgress = 0;
        error = undefined;
    }

    return {
        questions: collected,
        complete: collected.length >= goal,
        rounds,
        models: [...models],
        title: generatedTitle,
        description: generatedDescription,
        error,
    };
}
