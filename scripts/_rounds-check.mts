// Temporary harness: exercises the real round loop with a stubbed fetch.
// Run: node scripts/_rounds-check.mts
import { readFileSync, writeFileSync, rmSync } from "node:fs";

const source = readFileSync("src/lib/ai/client-generator.ts", "utf8")
    .replace('"@/lib/api-response"', '"../src/lib/api-response.ts"')
    .replace('"@/lib/ai/question-dedupe"', '"../src/lib/ai/question-dedupe.ts"');

writeFileSync("scripts/_tmp-generator.mts", source);

const temporaryGeneratorPath = "./_tmp-generator.mts";
const { generateQuestionsUntilComplete, MAX_GENERATION_ROUNDS } =
    await import(temporaryGeneratorPath);

interface Scenario {
    name: string;
    /** Questions the fake server gives back per round. */
    perRound: number | "all";
    /** Answer every request with a platform error instead. */
    fail?: "platform" | "provider";
    target: number;
}

function makeQuestions(start: number, amount: number) {
    const questions = [];
    for (let i = 0; i < amount; i++) {
        const n = start + i;
        questions.push({
            questionText: `ข้อสอบวัดความรู้ชุดที่ ${n}`,
            answers: [
                { answerText: `คำตอบ A${n}`, isCorrect: true, color: "red", order: 0 },
                { answerText: `คำตอบ B${n}`, isCorrect: false, color: "blue", order: 1 },
                { answerText: `คำตอบ C${n}`, isCorrect: false, color: "green", order: 2 },
                { answerText: `คำตอบ D${n}`, isCorrect: false, color: "yellow", order: 3 },
            ],
            timeLimit: 20,
            points: 1000,
        });
    }
    return questions;
}

const scenarios: Scenario[] = [
    { name: "server returns everything in one round", perRound: "all", target: 15 },
    { name: "server returns 3 per round (15 wanted)", perRound: 3, target: 15 },
    { name: "server returns 4 per round (10 wanted)", perRound: 4, target: 10 },
    { name: "server returns nothing usable", perRound: 0, target: 5 },
    { name: "platform kills the function (504 plain text)", perRound: 0, fail: "platform", target: 15 },
];

let failures = 0;

for (const scenario of scenarios) {
    let served = 0;
    let calls = 0;

    globalThis.fetch = (async (_url: string, init: RequestInit) => {
        calls += 1;
        const body = JSON.parse(String(init.body)) as { count: number; existingQuestions: string[] };
        const requested = Math.min(body.count, 50);

        if (scenario.fail === "platform") {
            return new Response("<html>An error occurred</html>", { status: 504 });
        }

        const amount = scenario.perRound === "all" ? requested : Math.min(scenario.perRound, requested);
        const questions = makeQuestions(served + 1, amount);
        served += questions.length;

        console.log(
            `   round ${calls}: asked ${requested} (existing: ${body.existingQuestions.length}) → gave ${questions.length}`
        );

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    questions,
                    requested,
                    generatedCount: questions.length,
                    remaining: Math.max(0, requested - questions.length),
                    model: "fake/model",
                },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    }) as typeof fetch;

    const result = await generateQuestionsUntilComplete({
        topic: "ทดสอบ",
        difficulty: "medium",
        target: scenario.target,
    });

    const unique = new Set(
        result.questions.map((question: { questionText: string }) => question.questionText)
    ).size;
    const expected = scenario.name.includes("nothing usable") || scenario.fail ? true : result.complete;

    const ok =
        unique === result.questions.length &&
        (scenario.fail
            ? !result.complete && result.questions.length === 0
            : scenario.perRound === 0
                ? !result.complete && result.questions.length === 0 && calls === 2
                : result.complete && result.questions.length === scenario.target);

    if (!ok) failures += 1;

    console.log(`${ok ? "PASS" : "FAIL"} — ${scenario.name}`);
    console.log(
        `   got=${result.questions.length}/${scenario.target} complete=${result.complete} rounds=${result.rounds}/${MAX_GENERATION_ROUNDS} calls=${calls} unique=${unique} error=${result.error ?? "-"}`
    );
    console.log(`   (expected=${expected})\n`);
}

rmSync("scripts/_tmp-generator.mts");
console.log(failures === 0 ? "ALL SCENARIOS PASSED" : `${failures} SCENARIO(S) FAILED`);
