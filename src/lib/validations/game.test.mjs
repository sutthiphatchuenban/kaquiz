import assert from "node:assert/strict";
import { test } from "node:test";
import { joinGameSchema, MAX_PLAYER_NAME_LENGTH } from "./game.ts";

const parseName = (nickname) => joinGameSchema.safeParse({ pin: "123456", nickname });

test("accepts Thai full name, department and employee ID longer than 20 characters", () => {
    const nickname = "สมชาย ใจดี แผนกเทคโนโลยีสารสนเทศ รหัสพนักงาน 001234";
    assert.ok(nickname.length > 20);
    const result = parseName(nickname);
    assert.equal(result.success, true);
    assert.equal(result.data.nickname, nickname);
});

test("accepts up to 200 characters and rejects names beyond the shared limit", () => {
    assert.equal(MAX_PLAYER_NAME_LENGTH, 200);
    assert.equal(parseName("ก".repeat(MAX_PLAYER_NAME_LENGTH)).success, true);
    assert.equal(parseName("ก".repeat(MAX_PLAYER_NAME_LENGTH + 1)).success, false);
});

test("trims leading and trailing spaces while preserving internal spaces and IDs", () => {
    assert.equal(parseName("  สมชาย ใจดี แผนก IT 00123  ").data.nickname, "สมชาย ใจดี แผนก IT 00123");
    assert.equal(parseName("   ").success, false);
    assert.equal(parseName("").success, false);
});

test("continues to reject invalid game PINs", () => {
    assert.equal(joinGameSchema.safeParse({ pin: "12345", nickname: "สมชาย" }).success, false);
    assert.equal(joinGameSchema.safeParse({ pin: "abcdef", nickname: "สมชาย" }).success, false);
});
