import type { getReport } from "@/lib/server/reports";

type Report = NonNullable<Awaited<ReturnType<typeof getReport>>>;
export type ReportExportMode = "summary" | "answers";
type Cell = string | number;

function csvCell(value: Cell): string {
    let text = String(value);
    // Quoting alone does not prevent spreadsheets from executing formulas.
    if (typeof value === "string" && /^[\s\u0000-\u001f]*[=+@-]/u.test(text)) {
        text = `'${text}`;
    }
    return `"${text.replaceAll('"', '""')}"`;
}

export function buildReportCsv(report: Report, mode: ReportExportMode): string {
    const questions = report.quiz.questions;
    const questionIds = new Set(questions.map((question) => question.id));
    const rows: Cell[][] = [[
        "Quiz", "PIN", "วันที่เปิดห้อง (เวลาประเทศไทย)", "สถานะเกม", "อันดับ", "ชื่อเล่น",
        "คะแนนรวม", "จำนวนคำถาม", "ส่งคำตอบ", "ตอบถูก", "ตอบผิด", "ไม่มีคำตอบ",
        ...(mode === "answers" ? ["ข้อ", "คำถาม", "คำตอบของผู้เล่น", "เฉลย", "ผล", "เวลาตอบ (วินาที)", "คะแนนรายข้อ"] : []),
    ]];
    const createdAt = report.createdAt.toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

    for (const player of report.players) {
        const answers = player.answers.filter((answer) => questionIds.has(answer.questionId));
        const correct = answers.filter((answer) => answer.isCorrect).length;
        const rank = report.players.findIndex((entry) => entry.score === player.score) + 1;
        const summary: Cell[] = [
            report.quiz.title, report.pin, createdAt, report.status, rank, player.nickname,
            player.score, questions.length, answers.length, correct,
            answers.length - correct, Math.max(0, questions.length - answers.length),
        ];
        if (mode === "summary") {
            rows.push(summary);
            continue;
        }
        const answersByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
        if (questions.length === 0) rows.push([...summary, "", "", "", "", "", "", ""]);
        questions.forEach((question, index) => {
            const answer = answersByQuestion.get(question.id);
            const notReached = report.status === "LOBBY" || index > report.currentQuestionIndex;
            rows.push([
                ...summary, index + 1, question.questionText,
                answer?.answer?.answerText ?? "",
                question.answers.filter((entry) => entry.isCorrect).map((entry) => entry.answerText).join(" / "),
                answer ? (answer.isCorrect ? "ถูก" : "ผิด") : (notReached ? "ยังไม่ถึงข้อนี้" : "ไม่มีคำตอบ"),
                answer ? answer.responseTime / 1000 : "",
                answer ? answer.pointsEarned : "",
            ]);
        });
    }

    // UTF-8 BOM allows Excel to recognize Thai text when opening the file directly.
    return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
