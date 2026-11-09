import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ChevronDown, Download } from "lucide-react";
import { getReport, getReportUserId } from "@/lib/server/reports";
import { PageHeading } from "@/components/page-heading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
    LOBBY: "รอผู้เล่น",
    PLAYING: "กำลังเล่น",
    QUESTION: "กำลังตอบคำถาม",
    SHOWING_ANSWER: "กำลังแสดงเฉลย",
    LEADERBOARD: "กำลังแสดงอันดับ",
    FINISHED: "เสร็จสิ้น",
};

function formatDate(date: Date) {
    return date.toLocaleString("th-TH", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
    });
}

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const userId = await getReportUserId();
    if (!userId) redirect(`/login?from=${encodeURIComponent(`/reports/${id}`)}`);

    const session = await getReport(id, userId);
    if (!session) notFound();

    const questions = session.quiz.questions;
    const questionIds = new Set(questions.map((question) => question.id));
    const players = session.players.map((player, _index, allPlayers) => {
        const answers = player.answers.filter((answer) => questionIds.has(answer.questionId));
        const correct = answers.filter((answer) => answer.isCorrect).length;
        const rank = allPlayers.findIndex((entry) => entry.score === player.score) + 1;
        return { ...player, answers, correct, rank };
    });
    const totalAnswers = players.reduce((sum, player) => sum + player.answers.length, 0);
    const totalCorrect = players.reduce((sum, player) => sum + player.correct, 0);
    const averageScore = players.length
        ? Math.round(players.reduce((sum, player) => sum + player.score, 0) / players.length)
        : 0;
    const stats = [
        { label: "ผู้เล่น", value: players.length.toLocaleString("th-TH") },
        { label: "คำถามทั้งหมด", value: questions.length.toLocaleString("th-TH") },
        { label: "คะแนนเฉลี่ย", value: averageScore.toLocaleString("th-TH") },
        { label: "ตอบถูกจากคำตอบที่ส่ง", value: totalAnswers ? `${Math.round(totalCorrect / totalAnswers * 100)}%` : "—" },
    ];

    return (
        <>
            <Link href="/reports" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink hover:underline">
                <ArrowLeft className="size-4" /> กลับไปรายงาน
            </Link>
            <PageHeading
                overline="GAME REPORT"
                title={session.quiz.title}
                description={`PIN: ${session.pin} · ${formatDate(session.createdAt)} · ${statusLabels[session.status] || session.status}`}
                actions={
                    <>
                        <a href={`/api/reports/${id}/export?type=summary`} download className="kq-btn kq-btn-yellow">
                            <Download className="size-4" aria-hidden="true" /> Export คะแนน (CSV)
                        </a>
                        <a href={`/api/reports/${id}/export?type=answers`} download className="kq-btn kq-btn-paper">
                            <Download className="size-4" aria-hidden="true" /> Export คำตอบ (CSV)
                        </a>
                    </>
                }
            />
            {session.status !== "FINISHED" && (
                <p className="kq-card mb-6 bg-[var(--sunny)] p-4 text-sm text-ink">
                    เกมนี้ยังไม่จบ ข้อมูลเป็นผล ณ เวลาที่เปิดหน้านี้ รีเฟรชหน้าเพื่อดูผลล่าสุด
                </p>
            )}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="kq-card p-5">
                        <p className="text-2xl font-extrabold tabular-nums text-ink">{stat.value}</p>
                        <p className="mt-2 text-sm font-semibold text-ink">{stat.label}</p>
                    </div>
                ))}
            </div>

            <section className="mt-8" aria-labelledby="player-results">
                <h2 id="player-results" className="mb-4 text-xl font-bold text-ink">ผลการเล่นรายคน</h2>
                <p className="mb-4 text-sm text-muted-foreground">เรียงตามคะแนนรวม กดชื่อผู้เล่นเพื่อดูคำตอบรายข้อ · คะแนนเท่ากันได้อันดับร่วมกัน</p>
                {players.length === 0 ? (
                    <div className="kq-card p-8 text-center text-muted-foreground">ยังไม่มีผู้เล่นเข้าร่วมเกมนี้</div>
                ) : (
                    <div className="space-y-3">
                        {players.map((player) => (
                            <details key={player.id} className="kq-card group overflow-hidden">
                                <summary className="flex min-h-16 cursor-pointer list-none flex-wrap items-center gap-3 p-5 focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
                                    <span className="kq-badge kq-badge-paper">#{player.rank}</span>
                                    <span className="min-w-0 flex-1 break-words font-bold text-ink">{player.nickname}</span>
                                    <span className="font-bold text-ink">{player.score.toLocaleString("th-TH")} คะแนน</span>
                                    <span className="text-sm text-muted-foreground">ถูก {player.correct}/{questions.length} · ส่งคำตอบ {player.answers.length} ข้อ</span>
                                    <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="border-t p-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>ข้อ / คำถาม</TableHead>
                                                <TableHead>คำตอบของผู้เล่น</TableHead>
                                                <TableHead>เฉลย</TableHead>
                                                <TableHead>ผล</TableHead>
                                                <TableHead>เวลาตอบ</TableHead>
                                                <TableHead>คะแนนที่ได้</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {questions.map((question, questionIndex) => {
                                                const answer = player.answers.find((entry) => entry.questionId === question.id);
                                                const notReached = session.status === "LOBBY" || questionIndex > session.currentQuestionIndex;
                                                return (
                                                    <TableRow key={question.id}>
                                                        <TableCell className="min-w-48 max-w-96 whitespace-normal align-top">{questionIndex + 1}. {question.questionText}</TableCell>
                                                        <TableCell className="min-w-36 max-w-72 whitespace-normal align-top">{answer?.answer?.answerText || "—"}</TableCell>
                                                        <TableCell className="min-w-36 max-w-72 whitespace-normal align-top">{question.answers.filter((entry) => entry.isCorrect).map((entry) => entry.answerText).join(" / ") || "—"}</TableCell>
                                                        <TableCell className="align-top">
                                                            {answer ? (
                                                                <span className={`kq-badge ${answer.isCorrect ? "kq-badge-mint" : "kq-badge-peach"}`}>{answer.isCorrect ? "ถูก" : "ผิด"}</span>
                                                            ) : (
                                                                <span className="text-muted-foreground">{notReached ? "ยังไม่ถึงข้อนี้" : "ไม่มีคำตอบ"}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="align-top">{answer ? `${(answer.responseTime / 1000).toFixed(2)} วินาที` : "—"}</TableCell>
                                                        <TableCell className="align-top">{answer ? answer.pointsEarned.toLocaleString("th-TH") : "—"}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </details>
                        ))}
                    </div>
                )}
            </section>
            <p className="mt-6 text-xs text-muted-foreground">
                ผู้เล่นระบุด้วยชื่อเล่นที่ใช้เข้าห้อง ไม่ใช่บัญชีสมาชิก · รายละเอียดคำถามและเฉลยอ้างอิง Quiz ปัจจุบัน หากมีการแก้ไข Quiz หลังเล่น ข้อมูลส่วนนี้อาจเปลี่ยนไป
                {session.endedAt ? ` · จบเกม ${formatDate(session.endedAt)}` : ""}
            </p>
        </>
    );
}
