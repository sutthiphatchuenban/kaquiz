import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

// Node strips TypeScript; resolve the production extensionless auth import only.
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === "../auth" && context.parentURL?.endsWith("/submit-game-answer.ts")) {
            return nextResolve(new URL("../auth.ts", context.parentURL).href, context);
        }
        return nextResolve(specifier, context);
    },
});
const { submitGameAnswer, SubmitAnswerError } = await import("./submit-game-answer.ts");

const start = 1_700_000_000_000;
const input = { playerId: "p1", questionId: "q1", answerId: "a1", responseTime: 0 };

// In-memory transaction double: model the player row lock and rollback without
// loading Prisma, connecting to a database, or reading database credentials.
function fixture() {
    const state = {
        session: { id: "s1", pin: "123456", quizId: "quiz1", status: "QUESTION", currentQuestionIndex: 0, startedAt: new Date(start) },
        player: { id: "p1", sessionId: "s1", score: 100 },
        questions: [
            { id: "q1", quizId: "quiz1", order: 0, points: 1000, timeLimit: 20 },
            { id: "q2", quizId: "quiz1", order: 1, points: 1000, timeLimit: 20 },
            { id: "foreign", quizId: "quiz2", order: 0, points: 1000, timeLimit: 20 },
        ],
        choices: [{ id: "a1", questionId: "q1", isCorrect: true }, { id: "a2", questionId: "q2", isCorrect: true }, { id: "wrong", questionId: "q1", isCorrect: false }],
        answers: [],
    };
    const calls = [];
    let queue = Promise.resolve();
    let failScore = false;
    const db = {
        async $transaction(callback, options) {
            assert.equal(options.isolationLevel, "ReadCommitted");
            let release;
            let snapshot;
            const tx = {
                async $queryRaw(strings, pin) {
                    assert.match(strings.join("?"), /WHERE pin = \? FOR SHARE/);
                    assert.equal(pin, "123456");
                    return [];
                },
                gameSession: { async findUnique({ where }) { return state.session?.pin === where.pin ? structuredClone(state.session) : null; } },
                player: {
                    async findUnique({ where }) { return state.player?.id === where.id ? structuredClone(state.player) : null; },
                    async update({ data }) {
                        const increment = data.score.increment;
                        if (!release) {
                            const previous = queue;
                            queue = new Promise(resolve => { release = resolve; });
                            await previous;
                            snapshot = structuredClone({ player: state.player, answers: state.answers });
                            assert.equal(increment, 0, "first update must acquire the row lock");
                            calls.push("lock");
                        } else {
                            calls.push("score");
                            if (failScore) throw new Error("simulated score write failure");
                        }
                        state.player.score += increment;
                        return structuredClone(state.player);
                    },
                },
                question: {
                    async findFirst({ where, skip = 0 }) {
                        return state.questions.filter(q => q.quizId === where.quizId && (!where.id || q.id === where.id))
                            .sort((a, b) => a.order - b.order)[skip] ?? null;
                    },
                },
                answer: { async findFirst({ where }) { return state.choices.find(a => a.id === where.id && a.questionId === where.questionId) ?? null; } },
                playerAnswer: {
                    async findFirst({ where }) {
                        assert.ok(release, "duplicate check must follow the player lock");
                        calls.push("duplicate");
                        return state.answers.find(a => a.playerId === where.playerId && a.questionId === where.questionId) ?? null;
                    },
                    async create({ data }) {
                        calls.push("insert");
                        const answer = { id: `record-${state.answers.length + 1}`, ...data };
                        state.answers.push(answer);
                        return answer;
                    },
                },
            };
            try {
                return await callback(tx);
            } catch (error) {
                if (snapshot) Object.assign(state, snapshot);
                throw error;
            } finally {
                release?.();
            }
        },
    };
    return { state, calls, db, failScore(value = true) { failScore = value; }, submit(body = input, elapsed = 10_000) { return submitGameAnswer(db, "123456", body, () => start + elapsed); } };
}

async function rejectsStatus(promise, status, message) {
    await assert.rejects(promise, error => error instanceof SubmitAnswerError && error.status === status && (!message || message.test(error.message)));
}

test("uses server elapsed time, atomically saves and returns restoration fields", async () => {
    const f = fixture();
    const result = await f.submit();
    assert.deepEqual(result, { questionId: "q1", isCorrect: true, pointsEarned: 750, answerId: "record-1", selectedAnswerId: "a1", score: 850 });
    assert.equal(f.state.answers[0].responseTime, 10_000);
    assert.deepEqual(f.calls, ["lock", "duplicate", "insert", "score"]);
});

test("captures arrival time before database work so processing delay does not reduce points", async () => {
    const f = fixture();
    let clockReads = 0;
    const result = await submitGameAnswer(f.db, "123456", input, () => start + 1000 + clockReads++ * 60000);
    assert.equal(result.pointsEarned, 975);
    assert.equal(f.state.answers[0].responseTime, 1000);
    assert.equal(clockReads, 1);
});

test("rejects malformed payloads before opening a transaction", async () => {
    const invalid = [null, [], "body", {}, ...["playerId", "questionId", "answerId"].flatMap(key => [0, {}, [], "", "  "].map(value => ({ ...input, [key]: value }))), ...[undefined, null, "0", -1, NaN, Infinity, -Infinity].map(responseTime => ({ ...input, responseTime }))];
    for (const body of invalid) {
        await rejectsStatus(submitGameAnswer({ $transaction() { assert.fail("invalid input opened transaction"); } }, "123456", body), 400);
    }
});

test("clamps negative server elapsed to zero and never trusts client timing", async () => {
    const f = fixture();
    assert.equal((await f.submit({ ...input, responseTime: 1e100 }, -100)).pointsEarned, 1000);
    assert.equal(f.state.answers[0].responseTime, 0);
});

test("rejects questions outside this quiz and choices outside this question", async () => {
    for (const body of [{ ...input, questionId: "foreign" }, { ...input, questionId: "missing" }, { ...input, answerId: "a2" }, { ...input, answerId: "missing" }]) {
        const f = fixture();
        await rejectsStatus(f.submit(body), 400);
        assert.equal(f.state.answers.length, 0);
        assert.equal(f.state.player.score, 100);
    }
});

test("rejects new answers to past/future questions using ordered question index", async () => {
    const f = fixture();
    // Index is a position, not the question.order value.
    f.state.questions[0].order = 10;
    f.state.questions[1].order = 30;
    await rejectsStatus(f.submit({ ...input, questionId: "q2", answerId: "a2" }), 409, /คำถามเปลี่ยน/);
    f.state.session.currentQuestionIndex = 1;
    await rejectsStatus(f.submit(), 409, /คำถามเปลี่ยน/);
    assert.equal((await f.submit({ ...input, questionId: "q2", answerId: "a2" })).questionId, "q2");
});

test("accepts up to the explicit 1500ms grace, rejects beyond it", async () => {
    for (const elapsed of [20_000, 21_500]) {
        const f = fixture();
        assert.equal((await f.submit(input, elapsed)).pointsEarned, 500);
    }
    const f = fixture();
    await rejectsStatus(f.submit(input, 21_501), 409, /หมดเวลา/);
    assert.equal(f.state.answers.length, 0);
});

test("grace never overrides non-QUESTION status or a missing start time", async () => {
    for (const status of ["LOBBY", "PLAYING", "SHOWING_ANSWER", "LEADERBOARD", "FINISHED"]) {
        const f = fixture();
        f.state.session.status = status;
        await rejectsStatus(f.submit(input, 100), 409, /ปิดรับ/);
    }
    const f = fixture();
    f.state.session.startedAt = null;
    await rejectsStatus(f.submit(), 409, /ยังไม่เริ่ม/);
});

test("retry restores original result after state advances and returns current score", async () => {
    const f = fixture();
    const first = await f.submit();
    f.state.session.status = "FINISHED";
    f.state.session.currentQuestionIndex = 1;
    f.state.session.startedAt = null;
    f.state.player.score += 50;
    assert.deepEqual(await f.submit({ ...input, answerId: "wrong" }, 100_000), { ...first, score: 900 });
    assert.equal(f.state.answers.length, 1);
    assert.equal(f.calls.filter(call => call === "score").length, 1);
});

test("concurrent duplicate requests serialize and award points exactly once", async () => {
    const f = fixture();
    const results = await Promise.all(Array.from({ length: 8 }, () => f.submit()));
    for (const result of results) assert.deepEqual(result, results[0]);
    assert.equal(f.state.answers.length, 1);
    assert.equal(f.state.player.score, 850);
    assert.equal(f.calls.filter(call => call === "score").length, 1);
});

test("score failure rolls the answer back so a retry can save normally", async () => {
    const f = fixture();
    f.failScore();
    await assert.rejects(f.submit(), /simulated score write failure/);
    assert.equal(f.state.answers.length, 0);
    assert.equal(f.state.player.score, 100);
    f.failScore(false);
    assert.equal((await f.submit()).score, 850);
    assert.equal(f.state.answers.length, 1);
});

test("rejects missing game or a player from another session, including retries", async () => {
    const f = fixture();
    await f.submit();
    f.state.player.sessionId = "another-session";
    await rejectsStatus(f.submit(), 404);
    f.state.player = null;
    await rejectsStatus(f.submit(), 404);
    f.state.session = null;
    await rejectsStatus(f.submit(), 404);
});

test("null or omitted selections and incorrect choices earn zero points", async () => {
    for (const answerId of [null, undefined, "wrong"]) {
        const f = fixture();
        const result = await f.submit({ ...input, answerId });
        assert.equal(result.pointsEarned, 0);
        assert.equal(result.isCorrect, false);
        assert.equal(result.selectedAnswerId, answerId ?? null);
        assert.equal(result.score, 100);
    }
});
