import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateServerOffset, isSameGameQuestion } from "./game-sync.ts";

const snapshot = () => ({
    id: "session-1", startedAt: "2026-11-09T12:00:00.000Z", currentQuestionIndex: 0,
    quiz: { questions: [{ id: "q1" }, { id: "q2" }] },
});

test("accepts delayed answer results for the same question", () => {
    assert.equal(isSameGameQuestion(snapshot(), snapshot()), true);
});

test("does not apply an old answer result after advancing to another question", () => {
    const current = snapshot();
    current.currentQuestionIndex = 1;
    assert.equal(isSameGameQuestion(current, snapshot()), false);
});

test("does not apply results from another session or restarted question", () => {
    assert.equal(isSameGameQuestion({ ...snapshot(), id: "session-2" }, snapshot()), false);
    assert.equal(isSameGameQuestion({ ...snapshot(), startedAt: "2026-11-09T12:01:00.000Z" }, snapshot()), false);
});

test("ignores results when the game or question is unavailable", () => {
    assert.equal(isSameGameQuestion(null, snapshot()), false);
    assert.equal(isSameGameQuestion(snapshot(), { ...snapshot(), currentQuestionIndex: 100 }), false);
});

test("clock synchronization uses request midpoint, not the device's wall clock", () => {
    const serverTime = Date.parse("2026-11-09T12:00:00.000Z");
    const sentAt = serverTime + 60000;
    const receivedAt = sentAt + 200;
    assert.equal(estimateServerOffset("2026-11-09T12:00:00.000Z", sentAt, receivedAt), -60100);
    assert.equal(estimateServerOffset("invalid", sentAt, receivedAt), 0);
});
