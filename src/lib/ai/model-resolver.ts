import OpenAI from "openai";

/**
 * Builds the ordered list of AI models this app will fall back through.
 *
 * Most providers are discovered live: the catalog is read from `/v1/models`,
 * chat-capable entries are ranked, and the best candidate is tried first. If it
 * fails, the next one is used. Some providers instead serve one known model
 * (Gemini is pinned to a single flash-lite model), and those entries skip the
 * catalog request entirely.
 *
 * Provider order defaults to Gemini → Gemini(2nd key) → OpenRouter → NVIDIA →
 * Groq → Cerebras → Mistral, and can be changed with AI_PROVIDER_ORDER. A
 * provider without an API key is skipped, so adding a key simply lengthens the
 * chain. The second Gemini key exists because free tiers are rate limited per
 * key, which makes it a genuine fallback rather than a duplicate.
 *
 * A model that fails hard is put on a short cooldown. Follow-up rounds of the
 * same generation (the client asks for more questions when a round comes back
 * short) then skip it instead of spending the whole budget on a model that is
 * known to be down.
 */

export type ProviderName =
    | "gemini"
    | "gemini2"
    | "openrouter"
    | "nvidia"
    | "groq"
    | "cerebras"
    | "mistral";

export interface ModelCandidate {
    provider: ProviderName;
    id: string;
}

interface ProviderConfig {
    name: ProviderName;
    baseURL: string;
    apiKey: string;
    defaultHeaders?: Record<string, string>;
    /** Only zero-cost catalog entries may be used (OpenRouter). */
    freeOnly?: boolean;
    /**
     * Known-good chat models, matched as substrings of the catalog id and
     * ranked by position. Catalog entries that match these float to the front
     * of that provider's part of the chain.
     */
    preferred?: string[];
    /**
     * Models used as-is, without asking the provider for its catalog. Use this
     * for providers that serve a single known model.
     */
    pinned?: string[];
}

/** How long a fetched catalog stays fresh before we re-fetch it. */
const CATALOG_TTL_MS = 10 * 60 * 1000;

/** Models to try per provider before giving up on that provider. */
const MAX_CANDIDATES_PER_PROVIDER = 6;

/** Upstream request timeout — keeps a single bad model from stalling the chain. */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Catalog reads are only a means to an end, so they get a much tighter
 * timeout than a completion — a slow `/v1/models` must not eat the budget
 * the generation itself needs.
 */
const CATALOG_TIMEOUT_MS = 3_000;

/** How long a model that failed hard is skipped by later rounds. */
const FAILURE_COOLDOWN_MS = 3 * 60 * 1000;

/**
 * Substrings marking a catalog entry as something other than a chat model
 * (embeddings, rerankers, safety classifiers, parsers, image/video tools).
 * These are listed by the providers but cannot answer a chat completion.
 */
const NON_CHAT_KEYWORDS = [
    "embed",
    "rerank",
    "reward",
    "nvclip",
    "clip",
    "detector",
    "guard",
    "content-safety",
    "topic-control",
    "nemoguard",
    "parse",
    "translat",
    "calibration",
    "synthetic",
    "whisper",
    "tts",
    "diffusion",
    "flux",
    "deplot",
    "fuyu",
    "kosmos",
    "neva",
];

/**
 * Models that think before they answer. They are the worst fit for a quiz
 * request on a deadline: free capacity is slow, and hidden reasoning is billed
 * as output tokens, so the answer is often cut off before any JSON appears.
 * They stay in the chain as a last resort, but behind everything else.
 */
const REASONING_PATTERN = /(reason|think|reflect|qwq|r1|magistral|note|preview|dbrx)/;

/** True when the model is one of those reasoning models. */
export function isReasoningModel(id: string): boolean {
    return REASONING_PATTERN.test(id.toLowerCase());
}

/**
 * Entries that can answer a chat completion but are tuned for something far
 * away from Thai quiz writing (code, math, SQL, vision, speech).
 */
const SPECIALIZED_PATTERN =
    /(code|sql|math|translate|-vl|codestral|starcoder|vision|audio|speech|image)/;

/** Mid-size models finish a short JSON answer sooner than huge ones. */
const FAST_SIZE_PATTERN = /(?:^|\D)(?:1b|1\.5b|2b|3b|4b|7b|8b|9b|12b|14b|20b|24b|27b|32b)(?:\D|$)/;

/** Shape of the extra metadata OpenRouter returns on `/models`. */
interface CatalogEntry {
    id?: string;
    created?: number;
    context_length?: number;
    pricing?: { prompt?: string; completion?: string };
    supported_parameters?: string[];
    architecture?: { output_modalities?: string[] };
}

function isNonChatModel(id: string): boolean {
    const lower = id.toLowerCase();
    return NON_CHAT_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/**
 * The only Gemini model this app asks for. Pinning it keeps the chain
 * predictable and skips the catalog request entirely.
 */
const GEMINI_MODEL = "gemini-flash-lite-latest";

const GEMINI_BASE_URL =
    process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";

function getProviders(): ProviderConfig[] {
    const providers: ProviderConfig[] = [
        {
            // Google AI Studio, free tier, OpenAI-compatible endpoint.
            name: "gemini",
            baseURL: GEMINI_BASE_URL,
            apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
            pinned: [GEMINI_MODEL],
        },
        {
            // Second key for the same model: free tiers are rate limited per
            // key, so a spare key is a real fallback rather than a duplicate.
            name: "gemini2",
            baseURL: GEMINI_BASE_URL,
            apiKey: process.env.GEMINI_API_KEY2 || "",
            pinned: [GEMINI_MODEL],
        },
        {
            name: "openrouter",
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY || "",
            defaultHeaders: {
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Kaquiz",
            },
            freeOnly: true,
            preferred: [
                "llama-3.3-70b-instruct",
                "mistral-small",
                "gemma-3",
                "qwen3",
                "deepseek-chat",
            ],
        },
        {
            name: "nvidia",
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: process.env.NVIDIA_API_KEY || "",
            preferred: [
                // gpt-oss-20b is the most reliable entry on NVIDIA's free tier:
                // it answers in a couple of seconds, where the larger models
                // often time out or are not enabled for every account.
                "gpt-oss-20b",
                "gemma-3-12b",
                "nemotron-3.5-lightning",
                "phi-3.5-moe",
                "mistral-7b-instruct",
                "glm-5.3-flash",
                "sea-lion",
                "zamba2-7b",
                "llama-3.3-70b-instruct",
                "llama-3.1-8b-instruct",
                "mistral-nemo",
                "qwen2.5",
            ],
        },
        {
            name: "groq",
            baseURL: "https://api.groq.com/openai/v1",
            apiKey: process.env.GROQ_API_KEY || "",
            preferred: [
                "llama-3.1-8b-instant",
                "llama-3.3-70b-versatile",
                "gemma2-9b-it",
                "gpt-oss-20b",
                "mistral-saba",
            ],
        },
        {
            name: "cerebras",
            baseURL: "https://api.cerebras.ai/v1",
            apiKey: process.env.CEREBRAS_API_KEY || "",
            preferred: ["llama3.1-8b", "llama-3.3-70b", "qwen-3-32b", "gpt-oss-20b"],
        },
        {
            name: "mistral",
            baseURL: "https://api.mistral.ai/v1",
            apiKey: process.env.MISTRAL_API_KEY || "",
            preferred: ["mistral-small", "open-mistral-nemo", "ministral-8b", "mistral-large"],
        },
    ];

    return orderProviders(providers);
}

const DEFAULT_PROVIDER_ORDER: ProviderName[] = [
    "gemini",
    "gemini2",
    "openrouter",
    "nvidia",
    "groq",
    "cerebras",
    "mistral",
];

/**
 * Applies AI_PROVIDER_ORDER (comma-separated provider names) when it is set,
 * keeping every provider that was not mentioned at the end of the list.
 */
function orderProviders(providers: ProviderConfig[]): ProviderConfig[] {
    const configured = (process.env.AI_PROVIDER_ORDER || "")
        .split(",")
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean);

    const order = configured.length > 0 ? configured : DEFAULT_PROVIDER_ORDER;

    const ranked = order
        .map((name) => providers.find((provider) => provider.name === name))
        .filter((provider): provider is ProviderConfig => !!provider);

    for (const provider of providers) {
        if (!ranked.includes(provider)) ranked.push(provider);
    }

    return ranked;
}

const clientCache = new Map<ProviderName, OpenAI>();

/** Returns the shared client for a provider, creating it on first use. */
export function getClient(provider: ProviderName): OpenAI {
    const cached = clientCache.get(provider);
    if (cached) return cached;

    const config = getProviders().find((p) => p.name === provider);
    if (!config) throw new Error(`Unknown AI provider: ${provider}`);

    const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        defaultHeaders: config.defaultHeaders,
        timeout: REQUEST_TIMEOUT_MS,
        maxRetries: 0,
    });

    clientCache.set(provider, client);
    return client;
}

/** Reads every catalog entry a provider advertises. */
async function fetchCatalog(config: ProviderConfig): Promise<CatalogEntry[]> {
    if (!config.apiKey) {
        console.warn(`[AI] ${config.name}: no API key configured, skipping provider`);
        return [];
    }

    try {
        const models = await getClient(config.name).models.list({
            timeout: CATALOG_TIMEOUT_MS,
        });
        return models.data as CatalogEntry[];
    } catch (error) {
        console.error(`[AI] ${config.name}: failed to list models —`, (error as Error).message);
        return [];
    }
}

/** OpenAI-compatible catalogs may prefix ids (`models/gemini-2.0-flash`). */
function normalizeModelId(raw: string): string {
    return raw.replace(/^models\//, "").trim();
}

/**
 * OpenRouter marks free models either with a `:free` suffix or with zero
 * pricing. Both forms are accepted; everything else would cost money.
 */
function isFreeOpenRouterModel(entry: CatalogEntry): boolean {
    if (entry.id?.endsWith(":free")) return true;

    const prompt = Number(entry.pricing?.prompt ?? "1");
    const completion = Number(entry.pricing?.completion ?? "1");
    return prompt === 0 && completion === 0;
}

/** Models that cannot emit text are useless for quiz generation. */
function outputsText(entry: CatalogEntry): boolean {
    const modalities = entry.architecture?.output_modalities;
    return !modalities || modalities.includes("text");
}

/**
 * Ranks a single catalog entry by how likely it is to return strict JSON for
 * a short Thai quiz request, quickly.
 */
function scoreCandidate(id: string, entry: CatalogEntry, config: ProviderConfig): number {
    const lower = id.toLowerCase();
    let score = 0;

    const preferredIndex = (config.preferred || []).findIndex(
        (model) => lower === model || lower.startsWith(`${model}-`) || lower.includes(model)
    );
    // The list order is a deliberate ranking, so it outweighs every other
    // signal below; the heuristics only order the models after it. The bonus
    // never decays to nothing: a preferred family stays above unknown models
    // even when it sits at the end of a long list.
    if (preferredIndex >= 0) score += Math.max(15, 80 - preferredIndex * 12);

    const params = entry.supported_parameters || [];
    if (params.includes("structured_outputs")) score += 20;
    else if (params.includes("response_format")) score += 10;
    if (params.includes("reasoning")) score -= 10;

    if (/instruct|chat|turbo|flash|instant|versatile|nemo/.test(lower)) score += 8;
    if (FAST_SIZE_PATTERN.test(lower)) score += 4;

    if (REASONING_PATTERN.test(lower)) score -= 45;
    if (SPECIALIZED_PATTERN.test(lower)) score -= 30;
    if (/70b|120b|235b|405b|550b|large/.test(lower)) score -= 6;

    return score;
}

/** Orders the usable entries of one provider into a fallback list. */
function rankCandidates(entries: CatalogEntry[], config: ProviderConfig): ModelCandidate[] {
    const seen = new Set<string>();
    const scored: { id: string; score: number; created: number }[] = [];

    for (const entry of entries) {
        if (!entry.id) continue;

        const id = normalizeModelId(entry.id);
        if (!id || seen.has(id)) continue;
        if (!outputsText(entry) || isNonChatModel(id)) continue;
        if (config.freeOnly && !isFreeOpenRouterModel(entry)) continue;

        seen.add(id);
        scored.push({
            id,
            score: scoreCandidate(id, entry, config),
            created: entry.created || 0,
        });
    }

    return scored
        .sort((a, b) => b.score - a.score || b.created - a.created)
        .slice(0, MAX_CANDIDATES_PER_PROVIDER)
        .map((candidate) => ({ provider: config.name, id: candidate.id }));
}

const OPENROUTER_FREE_ROUTER = "openrouter/free";

async function listCandidates(config: ProviderConfig): Promise<ModelCandidate[]> {
    // Pinned providers serve exactly one known model, so there is nothing to
    // discover and a catalog round trip would only cost time and quota.
    if (config.pinned?.length) {
        return config.pinned.map((id) => ({ provider: config.name, id }));
    }

    const ranked = rankCandidates(await fetchCatalog(config), config);

    if (config.name === "openrouter") {
        // OpenRouter's free router selects a currently available free model. It
        // is more resilient than pinning whichever preview model tops today's
        // catalog, so it is always tried first.
        return [
            { provider: "openrouter" as const, id: OPENROUTER_FREE_ROUTER },
            ...ranked.filter((candidate) => candidate.id !== OPENROUTER_FREE_ROUTER),
        ];
    }

    return ranked;
}

const cooldowns = new Map<string, number>();

const candidateKey = (candidate: ModelCandidate) => `${candidate.provider}:${candidate.id}`;

/**
 * A call that ran out of time says nothing about the model itself — the next
 * round may still reach it with a fresh budget, so it must not be benched.
 */
function isBudgetFailure(reason: string): boolean {
    return /budget|timed? ?out|timeout|abort|deadline/i.test(reason);
}

/** Clears the cooldown of a model that just produced questions. */
export function noteModelSuccess(candidate: ModelCandidate): void {
    cooldowns.delete(candidateKey(candidate));
}

/** Benches a model whose failure was not the request's fault. */
export function noteModelFailure(candidate: ModelCandidate, reason: string): void {
    if (isBudgetFailure(reason)) return;

    for (const [key, until] of cooldowns) {
        if (until <= Date.now()) cooldowns.delete(key);
    }
    cooldowns.set(candidateKey(candidate), Date.now() + FAILURE_COOLDOWN_MS);
}

/**
 * Drops models that recently failed. When every model is benched the full
 * chain is returned: retrying a benched model beats returning nothing.
 */
function applyCooldowns(chain: ModelCandidate[]): ModelCandidate[] {
    const now = Date.now();
    const ready = chain.filter((candidate) => (cooldowns.get(candidateKey(candidate)) || 0) <= now);
    return ready.length > 0 ? ready : chain;
}

let chainCache: { fetchedAt: number; chain: ModelCandidate[] } | null = null;
let inFlight: Promise<ModelCandidate[]> | null = null;

/**
 * Builds the ordered fallback chain across every configured provider. Fetched
 * catalogs are cached so a single request does not hit `/v1/models` more than
 * once per provider.
 */
export async function resolveModelChain(): Promise<ModelCandidate[]> {
    if (chainCache && Date.now() - chainCache.fetchedAt < CATALOG_TTL_MS) {
        return applyCooldowns(chainCache.chain);
    }

    // Collapse concurrent refreshes into one.
    if (inFlight) return applyCooldowns(await inFlight);

    inFlight = (async () => {
        const providers = getProviders();
        const perProvider = await Promise.all(providers.map((config) => listCandidates(config)));

        const chain = perProvider.flat();
        console.log(
            `[AI] model chain (${chain.length}): ${chain.map((c) => `${c.provider}:${c.id}`).join(", ") || "none"}`
        );
        return chain;
    })();

    try {
        const chain = await inFlight;
        // Don't cache an empty chain — a provider outage should be retried soon.
        if (chain.length > 0) chainCache = { fetchedAt: Date.now(), chain };
        return applyCooldowns(chain);
    } finally {
        inFlight = null;
    }
}
