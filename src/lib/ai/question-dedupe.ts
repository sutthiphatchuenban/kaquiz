/**
 * Similarity-based duplicate detection for generated quiz questions.
 *
 * An exact string match is not enough: models happily ask the same question
 * twice with different wording ("ข้อใดเป็นเมืองหลวงของไทย" vs "เมืองหลวงของ
 * ประเทศไทยคืออะไร"). Two independent signals are combined instead:
 *
 *  1. Text similarity — question phrasing and glue words are stripped first,
 *     so reworded variants collapse onto nearly the same character n-grams.
 *     N-grams are used because Thai has no word boundaries to tokenize on.
 *  2. Answer similarity — two questions offering the same set of choices are
 *     asking the same thing, no matter how the question is worded.
 */

export interface ComparableQuestion {
    questionText: string;
    answers?: { answerText?: string }[] | null;
}

const NGRAM_SIZE = 3;

/** Character n-gram overlap needed to treat two questions as the same one. */
const TEXT_JACCARD_THRESHOLD = 0.75;

/**
 * How much of the shorter question must appear in the longer one. Catches
 * reordered variants that Jaccard alone scores lower.
 */
const TEXT_CONTAINMENT_THRESHOLD = 0.85;

/** Answer-choice overlap (3 of 4 shared options) treated as the same question. */
const ANSWER_JACCARD_THRESHOLD = 0.6;

/** Punctuation, symbols and whitespace carry no meaning for comparison. */
const NOISE_PATTERN = /[\s\p{P}\p{S}]/gu;

/**
 * Question phrasing and glue words. Removing them makes reordered and
 * reworded variants of the same question compare equal.
 */
const FILLER_PATTERN =
    /(ข้อใด|ข้อไหน|ข้อต่อไปนี้|ข้อความใด|ต่อไปนี้|คำถาม|คำตอบ|จง|ท่าน|ตัวเลือก|จากตัวเลือก|ในตัวเลือก|ที่ถูกต้องที่สุด|ถูกต้องที่สุด|ที่ถูกต้อง|ที่ถูกที่สุด|ไม่ถูกต้อง|ที่ผิด|มากที่สุด|น้อยที่สุด|คืออะไร|คือ|เท่าใด|เท่าไหร่|เท่าไร|กี่|ของ|ใน|ที่|และ|กับ|เป็น)/g;

/** Lowercases and strips phrasing/punctuation, keeping only content. */
export function normalizeQuestionText(text: string): string {
    return (text || "")
        .toLowerCase()
        .replace(NOISE_PATTERN, "")
        .replace(FILLER_PATTERN, "");
}

function normalizeAnswerText(text: string): string {
    return (text || "").toLowerCase().replace(NOISE_PATTERN, "");
}

function ngrams(text: string): Set<string> {
    if (!text) return new Set();
    if (text.length <= NGRAM_SIZE) return new Set([text]);

    const grams = new Set<string>();
    for (let i = 0; i + NGRAM_SIZE <= text.length; i++) {
        grams.add(text.slice(i, i + NGRAM_SIZE));
    }
    return grams;
}

function countShared(a: Set<string>, b: Set<string>): number {
    let shared = 0;
    for (const value of a) {
        if (b.has(value)) shared++;
    }
    return shared;
}

function jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    const shared = countShared(a, b);
    return shared / (a.size + b.size - shared);
}

function containment(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    if (a.size > b.size) return containment(b, a);
    return countShared(a, b) / a.size;
}

function normalizeAnswers(question: ComparableQuestion): Set<string> {
    const answers = new Set<string>();
    for (const answer of question.answers || []) {
        const text = normalizeAnswerText(answer?.answerText || "");
        if (text) answers.add(text);
    }
    return answers;
}

/**
 * Collects the numbers a question mentions. Numbers are high-signal in
 * quizzes: "พ.ศ. 2500" vs "พ.ศ. 2510" or "2+2" vs "2+3" are different
 * questions even though the surrounding wording is identical, so a differing
 * number must never be treated as a mere rephrasing.
 */
function digitSignature(normalizedText: string): string {
    return (normalizedText.match(/\d+/g) || []).join(",");
}

/** True when both questions offer almost the same set of choices. */
function haveSameAnswers(a: ComparableQuestion, b: ComparableQuestion): boolean {
    const answersA = normalizeAnswers(a);
    const answersB = normalizeAnswers(b);

    if (answersA.size < 3 || answersB.size < 3) return false;
    return jaccard(answersA, answersB) >= ANSWER_JACCARD_THRESHOLD;
}

/** True when two questions ask the same thing, however they are worded. */
export function areQuestionsSimilar(a: ComparableQuestion, b: ComparableQuestion): boolean {
    const textA = normalizeQuestionText(a.questionText);
    const textB = normalizeQuestionText(b.questionText);

    if (textA && textA === textB) return true;

    // Same template with a different number is a different question.
    const digitsA = digitSignature(textA);
    const digitsB = digitSignature(textB);
    const sameNumbers = !digitsA && !digitsB ? true : digitsA === digitsB;

    if (sameNumbers) {
        const gramA = ngrams(textA);
        const gramB = ngrams(textB);
        if (
            jaccard(gramA, gramB) >= TEXT_JACCARD_THRESHOLD ||
            containment(gramA, gramB) >= TEXT_CONTAINMENT_THRESHOLD
        ) {
            return true;
        }
    }

    return haveSameAnswers(a, b);
}

/**
 * Keeps the first occurrence of every question and drops later ones, including
 * reworded or same-idea versions of a question already kept.
 */
export function dedupeQuestions<T extends ComparableQuestion>(questions: T[]): T[] {
    const unique: T[] = [];

    for (const question of questions) {
        if (!(question.questionText || "").trim()) continue;
        if (unique.some((kept) => areQuestionsSimilar(kept, question))) continue;
        unique.push(question);
    }

    return unique;
}
