import assert from "node:assert/strict";
import { test } from "node:test";
import { countQuestionAnswers } from "./answer-counts.ts";

test("counts selections separately and retains zero for unselected answers", () => {
    assert.deepEqual(countQuestionAnswers(["a", "b", "c"], [
        { playerId: "p1", answerId: "a" },
        { playerId: "p2", answerId: "a" },
        { playerId: "p3", answerId: "b" },
    ]), { counts: { a: 2, b: 1, c: 0 }, answered: 3 });
});

test("counts each player only once", () => {
    assert.deepEqual(countQuestionAnswers(["a", "b"], [
        { playerId: "p1", answerId: "a" },
        { playerId: "p1", answerId: "a" },
        { playerId: "p1", answerId: "b" },
    ]), { counts: { a: 1, b: 0 }, answered: 1 });
});

test("handles empty questions and games", () => {
    assert.deepEqual(countQuestionAnswers([], []), { counts: {}, answered: 0 });
    assert.deepEqual(countQuestionAnswers(["a"], []), { counts: { a: 0 }, answered: 0 });
});

test("does not attribute missing or unrelated answer IDs to a choice", () => {
    assert.deepEqual(countQuestionAnswers(["a"], [
        { playerId: "p1", answerId: null },
        { playerId: "p2", answerId: "other-question" },
    ]), { counts: { a: 0 }, answered: 2 });
});
