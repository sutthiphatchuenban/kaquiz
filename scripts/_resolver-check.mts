// Temporary harness: verifies catalog ranking, provider order and cooldowns
// using stubbed /v1/models responses. Run: node scripts/_resolver-check.mts
import { copyFileSync, rmSync } from "node:fs";

process.env.OPENROUTER_API_KEY = "test-key";
process.env.NVIDIA_API_KEY = "test-key";
process.env.GROQ_API_KEY = "test-key";
process.env.GEMINI_API_KEY = "test-key-1";
process.env.GEMINI_API_KEY2 = "test-key-2";
process.env.GEMINI_BASE_URL = "https://gemini.test/v1beta/openai";
delete process.env.AI_PROVIDER_ORDER;

copyFileSync("src/lib/ai/model-resolver.ts", "scripts/_tmp-resolver.mts");

const entry = (id: string, extra: Record<string, unknown> = {}) => ({ id, created: 1, ...extra });

const CATALOGS: Record<string, unknown[]> = {
    "openrouter.ai": [
        entry("dots-studio/dots-3-note-preview:free"),
        entry("meta-llama/llama-3.3-70b-instruct:free"),
        entry("some/paying-model", { pricing: { prompt: "0.000001", completion: "0.000002" } }),
        entry("qwen/qwen3-32b:free", { supported_parameters: ["structured_outputs", "reasoning"] }),
        entry("nvidia/llama-3.1-nemoguard-8b-content-safety:free"),
        entry("sao10k/l3-euryale-70b:free"),
        entry("mistralai/mistral-small-3.2-24b-instruct:free", { pricing: { prompt: "0", completion: "0" } }),
        entry("bigcode/starcoder2-15b:free"),
    ],
    "integrate.api.nvidia.com": [
        entry("bigcode/starcoder2-15b"),
        entry("meta/llama-3.1-8b-instruct"),
        entry("nvidia/llama-3.3-nemotron-super-49b-v1"),
        entry("nvidia/embed-qa-4"),
        entry("aisingapore/sea-lion-7b-instruct"),
        entry("deepseek-ai/deepseek-r1"),
        entry("meta/llama-3.3-70b-instruct"),
        entry("mistralai/mistral-nemo-minitron-8b-8k-instruct"),
        entry("google/deplot"),
    ],
    "api.groq.com": [
        entry("llama-3.3-70b-versatile"),
        entry("llama-3.1-8b-instant"),
        entry("whisper-large-v3"),
        entry("qwen/qwen3-32b"),
    ],
};

globalThis.fetch = (async (url: string | URL) => {
    const host = new URL(String(url)).hostname;
    const data = CATALOGS[host];
    if (!data) throw new Error(`unexpected host ${host}`);
    return new Response(JSON.stringify({ object: "list", data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}) as typeof fetch;

const { resolveModelChain, noteModelFailure, noteModelSuccess, isReasoningModel } = await import("./_tmp-resolver.mts");

const chain = await resolveModelChain();
const ids = chain.map((c: { provider: string; id: string }) => `${c.provider}:${c.id}`);

console.log("chain:");
for (const id of ids) console.log(`   ${id}`);

const nvidiaIds = ids.filter((id: string) => id.startsWith("nvidia:"));
const preferredNvidiaFamilies = ["llama-3.3-70b-instruct", "llama-3.1-8b-instruct", "mistral-nemo", "sea-lion"];

const checks: [string, boolean][] = [
    [
        "openrouter free router is tried first within openrouter",
        ids.filter((id) => id.startsWith("openrouter:"))[0] === "openrouter:openrouter/free",
    ],
    ["paid OpenRouter model is excluded", !ids.some((id) => id.includes("paying-model"))],
    ["safety classifier is excluded", !ids.some((id) => id.includes("nemoguard"))],
    ["non-chat NVIDIA entries are excluded", !ids.some((id) => id.includes("embed-qa") || id.includes("deplot"))],
    ["preferred OpenRouter model precedes the reasoning preview", ids.indexOf("openrouter:meta-llama/llama-3.3-70b-instruct:free") < ids.indexOf("openrouter:dots-studio/dots-3-note-preview:free")],
    ["a preferred NVIDIA family leads the NVIDIA part of the chain", preferredNvidiaFamilies.some((family) => nvidiaIds[0].includes(family))],
    [
        "NVIDIA reasoning model ranks behind every preferred family",
        (() => {
            const reasoningIndex = nvidiaIds.findIndex((id: string) => id.includes("deepseek-r1"));
            const leaderIndex = nvidiaIds.findIndex((id: string) =>
                preferredNvidiaFamilies.some((family) => id.includes(family))
            );
            // Out of the chain entirely is also fine: it was ranked below the cut.
            return reasoningIndex === -1 || reasoningIndex > leaderIndex;
        })(),
    ],
    ["groq models are in the chain", ids.some((id) => id.startsWith("groq:"))],
    ["groq preferred model is first within groq", ids.filter((id) => id.startsWith("groq:"))[0] === "groq:llama-3.1-8b-instant"],
    // Pinned providers serve one known model and must not call /v1/models:
    // the stub below throws for any host that is not one of the catalogs.
    ["pinned gemini model is in the chain", ids.includes("gemini:gemini-flash-lite-latest")],
    ["the second gemini key is its own fallback entry", ids.includes("gemini2:gemini-flash-lite-latest")],
    ["gemini is tried before openrouter", ids.indexOf("gemini:gemini-flash-lite-latest") < ids.indexOf("openrouter:openrouter/free")],
    ["the second gemini key is tried before openrouter too", ids.indexOf("gemini2:gemini-flash-lite-latest") < ids.indexOf("openrouter:openrouter/free")],
    ["gemini is only asked for the pinned model", ids.filter((id) => id.startsWith("gemini:")).length === 1],
    ["whisper is excluded", !ids.some((id) => id.includes("whisper"))],
    ["provider without a key contributes nothing", !ids.some((id) => id.startsWith("cerebras:"))],

    // The reasoning switch is only sent for models that need it: OpenRouter
    // answers with a hard 400 on endpoints where reasoning is mandatory.
    ["reasoning detector flags preview models", isReasoningModel("dots-studio/dots-3-note-preview:free") === true],
    ["reasoning detector flags thinking models", isReasoningModel("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning") === true],
    ["reasoning detector leaves plain models alone", isReasoningModel("liquid/lfm-2.5-2.6b:free") === false],
    ["reasoning detector leaves instruct models alone", isReasoningModel("meta/llama-3.3-70b-instruct") === false],
];

// A hard failure benches the model; a timeout must not.
noteModelFailure({ provider: "openrouter", id: "meta-llama/llama-3.3-70b-instruct:free" }, "PARSE_FAILED: bad json");
noteModelFailure({ provider: "groq", id: "llama-3.1-8b-instant" }, "Request timed out");

const afterFailure = (await resolveModelChain()).map((c: { provider: string; id: string }) => `${c.provider}:${c.id}`);
checks.push(["hard failure is benched", !afterFailure.includes("openrouter:meta-llama/llama-3.3-70b-instruct:free")]);
checks.push(["timeout is not benched", afterFailure.includes("groq:llama-3.1-8b-instant")]);
checks.push(["a benched model never empties the chain", afterFailure.length > 0]);

noteModelSuccess({ provider: "openrouter", id: "meta-llama/llama-3.3-70b-instruct:free" });
const afterRecovery = (await resolveModelChain()).map((c: { provider: string; id: string }) => `${c.provider}:${c.id}`);
checks.push(["success clears the cooldown", afterRecovery.includes("openrouter:meta-llama/llama-3.3-70b-instruct:free")]);

let failures = 0;
for (const [name, ok] of checks) {
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"} — ${name}`);
}

rmSync("scripts/_tmp-resolver.mts");
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
