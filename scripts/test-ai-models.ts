/**
 * AI Model Benchmark Test
 * ทดสอบทุกโมเดล AI ที่ใช้กับ KaQuiz
 * วัด: เวลา, จำนวนข้อที่ได้, คุณภาพ JSON, คำถามซ้ำ
 *
 * วิธีรัน: npx tsx scripts/test-ai-models.ts
 */

import OpenAI from "openai";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env") });

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1",
});

// ── Models to test ───────────────────────────────────────────────────
const MODELS: Record<string, string> = {
    "Mistral Small 4": "mistralai/mistral-small-4-119b-2603",
    "GPT-OSS 120B": "openai/gpt-oss-120b",
    "GPT-OSS 20B": "openai/gpt-oss-20b",
    "Gemma 3N": "google/gemma-3n-e4b-it",
};

const TOPIC = "ประวัติศาสตร์ไทย";
const QUESTION_COUNT = 5;
const DIFFICULTY = "medium";

// ── Prompt (same as production) ──────────────────────────────────────
const SYSTEM_PROMPT = `You are a quiz question generator. You MUST respond with ONLY a valid JSON array and nothing else.
No markdown, no code fences, no explanation, no prose. Just a raw JSON array starting with [ and ending with ].
If asked to generate N questions, the array must have exactly N elements.`;

const USER_PROMPT = `Generate ${QUESTION_COUNT} quiz questions about: "${TOPIC}"
Difficulty: ${DIFFICULTY}

Output ONLY this JSON array structure (no other text):
[
  {
    "questionText": "คำถาม (ภาษาไทย, ไม่เกิน 100 ตัวอักษร)",
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

Rules:
- Exactly 4 answers per question
- Exactly 1 answer with isCorrect: true
- Colors must be exactly: "red","blue","green","yellow" in order
- Questions and answers must be in Thai language
- Return EXACTLY ${QUESTION_COUNT} questions
- Each question must be UNIQUE
- Output raw JSON array ONLY - no markdown, no backticks, no explanation`;

// ── Types ────────────────────────────────────────────────────────────
interface TestResult {
    model: string;
    modelId: string;
    status: "✅ PASS" | "❌ FAIL" | "⏱️ TIMEOUT" | "🚫 ERROR";
    timeMs: number;
    questionsRequested: number;
    questionsReceived: number;
    validJson: boolean;
    allHave4Answers: boolean;
    allHaveCorrectAnswer: boolean;
    allInThai: boolean;
    duplicateQuestions: number;
    responseLength: number;
    finishReason: string;
    error?: string;
    sampleQuestion?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────
function stripThinkingTags(text: string): string {
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
    text = text.replace(/thinking:[\s\S]*?(?=({|\[))/gi, "");
    return text.trim();
}

function tryParseJson(text: string): any[] | null {
    // Strip markdown fences
    text = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();

    // Try direct parse
    try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : null;
    } catch { }

    // Try extracting array from text
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch { }
    }

    return null;
}

function containsThai(text: string): boolean {
    return /[\u0E00-\u0E7F]/.test(text);
}

// ── Test a single model ──────────────────────────────────────────────
async function testModel(name: string, modelId: string): Promise<TestResult> {
    const result: TestResult = {
        model: name,
        modelId,
        status: "🚫 ERROR",
        timeMs: 0,
        questionsRequested: QUESTION_COUNT,
        questionsReceived: 0,
        validJson: false,
        allHave4Answers: false,
        allHaveCorrectAnswer: false,
        allInThai: false,
        duplicateQuestions: 0,
        responseLength: 0,
        finishReason: "n/a",
    };

    const startTime = Date.now();

    try {
        const completion = await openai.chat.completions.create({
            model: modelId,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: USER_PROMPT },
            ],
            temperature: 0.2,
            top_p: 0.7,
            max_tokens: 8192,
        });

        result.timeMs = Date.now() - startTime;
        let responseText = completion.choices[0]?.message?.content || "";
        result.finishReason = completion.choices[0]?.finish_reason || "unknown";
        result.responseLength = responseText.length;

        // Strip thinking tags
        responseText = stripThinkingTags(responseText);

        // Parse JSON
        const questions = tryParseJson(responseText);

        if (!questions) {
            result.status = "❌ FAIL";
            result.error = "JSON parse failed";
            return result;
        }

        result.validJson = true;
        result.questionsReceived = questions.length;

        // Validate each question
        const questionTexts: string[] = [];
        let all4Answers = true;
        let allCorrect = true;
        let allThai = true;

        for (const q of questions) {
            const answers = q.answers || [];
            if (answers.length !== 4) all4Answers = false;
            if (!answers.some((a: any) => a.isCorrect === true)) allCorrect = false;
            if (!containsThai(q.questionText || "")) allThai = false;
            questionTexts.push(q.questionText || "");
        }

        result.allHave4Answers = all4Answers;
        result.allHaveCorrectAnswer = allCorrect;
        result.allInThai = allThai;

        // Check duplicates
        const uniqueTexts = new Set(questionTexts);
        result.duplicateQuestions = questionTexts.length - uniqueTexts.size;

        // Sample
        result.sampleQuestion = questionTexts[0]?.substring(0, 60) || "n/a";

        // Determine pass/fail
        if (
            result.validJson &&
            result.questionsReceived >= QUESTION_COUNT &&
            result.allHave4Answers &&
            result.allHaveCorrectAnswer &&
            result.allInThai &&
            result.duplicateQuestions === 0
        ) {
            result.status = "✅ PASS";
        } else {
            result.status = "❌ FAIL";
            const issues: string[] = [];
            if (result.questionsReceived < QUESTION_COUNT) issues.push(`got ${result.questionsReceived}/${QUESTION_COUNT}`);
            if (!result.allHave4Answers) issues.push("missing answers");
            if (!result.allHaveCorrectAnswer) issues.push("no correct answer");
            if (!result.allInThai) issues.push("not Thai");
            if (result.duplicateQuestions > 0) issues.push(`${result.duplicateQuestions} duplicates`);
            result.error = issues.join(", ");
        }

    } catch (err: any) {
        result.timeMs = Date.now() - startTime;
        if (result.timeMs > 60000) {
            result.status = "⏱️ TIMEOUT";
            result.error = `Timed out after ${(result.timeMs / 1000).toFixed(1)}s`;
        } else {
            result.status = "🚫 ERROR";
            result.error = err?.message?.substring(0, 80) || "Unknown error";
        }
    }

    return result;
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║        🧪 KaQuiz AI Model Benchmark Test                   ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  Topic: ${TOPIC.padEnd(50)}║`);
    console.log(`║  Questions: ${QUESTION_COUNT}  |  Difficulty: ${DIFFICULTY.padEnd(30)}║`);
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log();

    const results: TestResult[] = [];

    for (const [name, modelId] of Object.entries(MODELS)) {
        process.stdout.write(`⏳ Testing ${name}...`);
        const result = await testModel(name, modelId);
        results.push(result);
        console.log(` ${result.status} (${(result.timeMs / 1000).toFixed(1)}s)`);
    }

    // ── Summary Table ────────────────────────────────────────────────
    console.log("\n");
    console.log("┌──────────────────┬────────┬────────┬───────┬──────────┬──────────┬───────┬──────────────────────────┐");
    console.log("│ Model            │ Status │ Time   │ Q Got │ JSON OK  │ Thai OK  │ Dupes │ Notes                    │");
    console.log("├──────────────────┼────────┼────────┼───────┼──────────┼──────────┼───────┼──────────────────────────┤");

    for (const r of results) {
        const model = r.model.padEnd(16);
        const status = r.status;
        const time = `${(r.timeMs / 1000).toFixed(1)}s`.padStart(6);
        const qGot = `${r.questionsReceived}/${r.questionsRequested}`.padStart(5);
        const json = r.validJson ? "  ✅  " : "  ❌  ";
        const thai = r.allInThai ? "  ✅  " : "  ❌  ";
        const dupes = String(r.duplicateQuestions).padStart(5);
        const notes = (r.error || r.sampleQuestion || "").substring(0, 24).padEnd(24);
        console.log(`│ ${model} │ ${status} │ ${time} │ ${qGot} │ ${json}  │ ${thai}  │ ${dupes} │ ${notes} │`);
    }

    console.log("└──────────────────┴────────┴────────┴───────┴──────────┴──────────┴───────┴──────────────────────────┘");

    // ── Ranking ──────────────────────────────────────────────────────
    const passed = results.filter(r => r.status === "✅ PASS");
    const ranked = passed.sort((a, b) => a.timeMs - b.timeMs);

    if (ranked.length > 0) {
        console.log("\n🏆 Speed Ranking (PASS only):");
        ranked.forEach((r, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
            console.log(`   ${medal} ${(r.timeMs / 1000).toFixed(1)}s — ${r.model}`);
        });
    }

    // ── Failed models ────────────────────────────────────────────────
    const failed = results.filter(r => r.status !== "✅ PASS");
    if (failed.length > 0) {
        console.log("\n⚠️  Models with issues:");
        for (const r of failed) {
            console.log(`   ${r.status} ${r.model}: ${r.error}`);
        }
    }

    console.log("\n✨ Benchmark complete!");
}

main().catch(console.error);
