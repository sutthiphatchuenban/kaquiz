import { compare, hash } from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
    return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
    password: string,
    hashedPassword: string
): Promise<boolean> {
    return compare(password, hashedPassword);
}

// Generate a random 6-digit PIN for game sessions
export function generateGamePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Calculate points based on response time and time limit
// Faster responses get more points (Kahoot-style scoring)
export function calculatePoints(
    isCorrect: boolean,
    responseTimeMs: number,
    timeLimitMs: number,
    maxPoints: number = 1000
): number {
    if (!isCorrect) return 0;

    // Base points for correct answer: 50%
    // Time bonus: up to 50% based on speed
    const basePoints = maxPoints * 0.5;
    const timeRatio = Math.max(0, 1 - responseTimeMs / timeLimitMs);
    const timeBonus = maxPoints * 0.5 * timeRatio;

    return Math.round(basePoints + timeBonus);
}
