interface QuestionSnapshot {
    id: string;
    startedAt: string | null;
    currentQuestionIndex: number;
    quiz: { questions: { id: string }[] };
}

export function isSameGameQuestion(current: QuestionSnapshot | null, submitted: QuestionSnapshot): boolean {
    const questionId = submitted.quiz.questions[submitted.currentQuestionIndex]?.id;
    return !!current && !!questionId && current.id === submitted.id &&
        current.startedAt === submitted.startedAt &&
        current.quiz.questions[current.currentQuestionIndex]?.id === questionId;
}

export function estimateServerOffset(serverNow: string, sentAt: number, receivedAt: number): number {
    const serverTime = Date.parse(serverNow);
    return Number.isFinite(serverTime) ? serverTime - (sentAt + receivedAt) / 2 : 0;
}
