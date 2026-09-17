import OpenAI from "openai";

/**
 * Discovers the AI models that are actually available right now and orders
 * them into a fallback chain.
 *
 * Nothing here is pinned to a specific model — the catalog is read from each
 * provider's `/v1/models` endpoint, free/chat-capable entries are kept, and
 * the best candidate is tried first. If it fails, the next one is used.
 *
 * Provider order: OpenRouter (free models) first, then NVIDIA.
 */

export type ProviderName = "openrouter" | "nvidia";

export interface ModelCandidate {
    provider: ProviderName;
    id: string;
}

interface ProviderConfig {
    name: ProviderName;
    baseURL: string;
    apiKey: string;
    defaultHeaders?: Record<string, string>;
}

/** How long a fetched catalog stays fresh before we re-fetch it. */
const CATALOG_TTL_MS = 10 * 60 * 1000;

/** Models to try per provider before giving up on that provider. */
const MAX_CANDIDATES_PER_PROVIDER = 5;

/** Upstream request timeout — keeps a single bad model from stalling the chain. */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Catalog reads are only a means to an end, so they get a much tighter
 * timeout than a completion — a slow `/v1/models` must not eat the budget
 * the generation itself needs.
 */
const CATALOG_TIMEOUT_MS = 8_000;

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

function getProviders(): ProviderConfig[] {
    return [
        {
            name: "openrouter",
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY || "",
            defaultHeaders: {
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Kaquiz",
            },
        },
        {
            name: "nvidia",
            baseURL: "https://integrate.api.nvidia.com/v1",
            apiKey: process.env.NVIDIA_API_KEY || "",
        },
    ];
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
 * Ranks candidates by how likely they are to return strict JSON: models
 * advertising structured output support first, then larger context windows.
 */
function rankOpenRouterModels(entries: CatalogEntry[]): CatalogEntry[] {
    const score = (entry: CatalogEntry) => {
        const params = entry.supported_parameters || [];
        if (params.includes("structured_outputs")) return 2;
        if (params.includes("response_format")) return 1;
        return 0;
    };

    return [...entries].sort((a, b) => {
        const byScore = score(b) - score(a);
        if (byScore !== 0) return byScore;
        return (b.context_length || 0) - (a.context_length || 0);
    });
}

async function listOpenRouterCandidates(config: ProviderConfig): Promise<ModelCandidate[]> {
    const catalog = await fetchCatalog(config);

    return rankOpenRouterModels(
        catalog.filter(
            (entry) =>
                !!entry.id &&
                isFreeOpenRouterModel(entry) &&
                outputsText(entry) &&
                !isNonChatModel(entry.id)
        )
    )
        .slice(0, MAX_CANDIDATES_PER_PROVIDER)
        .map((entry) => ({ provider: "openrouter" as const, id: entry.id! }));
}

async function listNvidiaCandidates(config: ProviderConfig): Promise<ModelCandidate[]> {
    const catalog = await fetchCatalog(config);

    return catalog
        .filter((entry) => !!entry.id && !isNonChatModel(entry.id))
        .slice(0, MAX_CANDIDATES_PER_PROVIDER)
        .map((entry) => ({ provider: "nvidia" as const, id: entry.id! }));
}

let chainCache: { fetchedAt: number; chain: ModelCandidate[] } | null = null;
let inFlight: Promise<ModelCandidate[]> | null = null;

/**
 * Builds the ordered fallback chain: OpenRouter free models first, then
 * NVIDIA. Fetched catalogs are cached so a single request does not hit
 * `/v1/models` more than once.
 */
export async function resolveModelChain(): Promise<ModelCandidate[]> {
    if (chainCache && Date.now() - chainCache.fetchedAt < CATALOG_TTL_MS) {
        return chainCache.chain;
    }

    // Collapse concurrent refreshes into one.
    if (inFlight) return inFlight;

    inFlight = (async () => {
        const providers = getProviders();
        const perProvider = await Promise.all(
            providers.map((config) =>
                config.name === "openrouter"
                    ? listOpenRouterCandidates(config)
                    : listNvidiaCandidates(config)
            )
        );

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
        return chain;
    } finally {
        inFlight = null;
    }
}
