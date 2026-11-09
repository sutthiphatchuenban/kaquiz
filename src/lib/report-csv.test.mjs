import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReportCsv } from "./report-csv.ts";

function makeReport() {
    return {
        pin: "931300", status: "FINISHED", currentQuestionIndex: 1,
        createdAt: new Date("2026-11-06T09:14:00Z"), endedAt: null,
        quiz: {
            title: 'ทดสอบ, "ภาษาไทย"',
            questions: [
                { id: "q1", questionText: "คำถามแรก\nบรรทัดสอง", answers: [{ answerText: "ใช่", isCorrect: true }] },
                { id: "q2", questionText: "คำถามสอง", answers: [{ answerText: "ไม่ใช่", isCorrect: true }] },
            ],
        },
        players: [
            {
                id: "p1", nickname: "สมชาย", score: 900,
                answers: [{ questionId: "q1", isCorrect: true, responseTime: 1234, pointsEarned: 900, answer: { answerText: "ใช่" } }],
            },
            { id: "p2", nickname: "สมหญิง", score: 900, answers: [] },
            { id: "p3", nickname: "ผู้เล่นสาม", score: 0, answers: [] },
        ],
    };
}

test("CSV includes UTF-8 BOM, Thai text, escaped quotes, and CRLF", () => {
    const csv = buildReportCsv(makeReport(), "summary");
    assert.ok(csv.startsWith("\uFEFF"));
    assert.ok(csv.includes('"ทดสอบ, ""ภาษาไทย"""'));
    assert.ok(csv.includes('"สมชาย"'));
    assert.equal(csv.split("\r\n").length, 5);
    assert.ok(csv.endsWith("\r\n"));
});

test("summary preserves tied ranks and correct answer totals", () => {
    const csv = buildReportCsv(makeReport(), "summary");
    assert.ok(csv.includes('"1","สมชาย","900","2","1","1","0","1"'));
    assert.ok(csv.includes('"1","สมหญิง"'));
    assert.ok(csv.includes('"3","ผู้เล่นสาม"'));
    assert.ok(!csv.includes("คำถามแรก"));
});

test("detail includes each question, answer, result, seconds and score", () => {
    const csv = buildReportCsv(makeReport(), "answers");
    assert.ok(csv.includes('"คำถามแรก\nบรรทัดสอง","ใช่","ใช่","ถูก","1.234","900"'));
    assert.ok(csv.includes('"คำถามสอง","","ไม่ใช่","ไม่มีคำตอบ","",""'));
    assert.ok(csv.includes('"1","สมหญิง"'));
});

test("formula-like user text is neutralized including leading whitespace", () => {
    for (const value of ["=SUM(1,2)", "+cmd", "-cmd", "@SUM(1)", " \t=1+1", "\r=1+1"]) {
        const report = makeReport();
        report.players[0].nickname = value;
        const csv = buildReportCsv(report, "summary");
        assert.ok(csv.includes(`"'${value}"`));
    }
});

test("unrelated answers do not affect summary totals", () => {
    const report = makeReport();
    report.players[0].answers.push({ questionId: "other-quiz", isCorrect: true, responseTime: 100, pointsEarned: 10, answer: null });
    assert.ok(buildReportCsv(report, "summary").includes('"900","2","1","1","0","1"'));
});

test("active games distinguish unreached questions", () => {
    const report = makeReport();
    report.status = "QUESTION";
    report.currentQuestionIndex = 0;
    assert.ok(buildReportCsv(report, "answers").includes('"คำถามสอง","","ไม่ใช่","ยังไม่ถึงข้อนี้"'));
});

test("empty games export a header without crashing", () => {
    const report = makeReport();
    report.players = [];
    for (const mode of ["summary", "answers"]) {
        const csv = buildReportCsv(report, mode);
        assert.ok(csv.startsWith('\uFEFF"Quiz"'));
        assert.equal(csv.split("\r\n").length, 2);
    }
});
