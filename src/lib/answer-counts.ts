interface Response {
    playerId: string;
    answerId: string | null;
}

export function countQuestionAnswers(answerIds: string[], responses: Response[]) {
    const counts: Record<string, number> = Object.fromEntries(answerIds.map((id) => [id, 0]));
    const players = new Set<string>();
    for (const response of responses) {
        if (players.has(response.playerId)) continue;
        players.add(response.playerId);
        if (response.answerId && Object.hasOwn(counts, response.answerId)) {
            counts[response.answerId] += 1;
        }
    }
    return { counts, answered: players.size };
}
