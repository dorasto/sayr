/**
 * Curated set of models Sayr exposes through Requesty (https://requesty.ai).
 * This is a deliberately small, business-curated roster — NOT Requesty's full
 * catalog. IDs use Requesty's `provider/model` routing format:
 * https://docs.requesty.ai/features/supported-models
 *
 * Add to this list as the team decides to support more models. Every model
 * offered to orgs (see `REQUESTY_MODEL_CATALOG`) must appear here so it gets
 * real type-level + runtime validation (`resolveModelId`) rather than being
 * an arbitrary trusted string.
 *
 * Deliberately free of any `@tanstack/ai`/provider import — this module is
 * imported directly (`@repo/ai/models`, not the package root) from the
 * frontend settings UI, so it must stay safe for a browser bundle. The
 * `createModel()` mapping for `openaiCompatible`'s model catalog lives in
 * the server-only client.ts instead, built from `MODEL_ROSTER` below.
 */
/**
 * `pricing` is USD per 1M tokens, used only to estimate `_cost`/`cost_cents`
 * for Polar billing + the console usage view (see text.ts). Not read from
 * Requesty's response: the generic `openaiCompatible` adapter (client.ts)
 * doesn't surface Requesty's `usage.cost` extension field (only its
 * OpenRouter-specific adapter does, and that one's stream parser is
 * incompatible with Requesty's actual wire format — see client.ts's module
 * doc). Figures are Mistral's published direct rates
 * (https://mistral.ai/pricing) with Requesty's documented 5% markup
 * (https://docs.requesty.ai) applied — an estimate, not the exact billed
 * amount. Revisit via Requesty's usage API
 * (https://docs.requesty.ai/api-reference/endpoint/manage-apikey/manage-api-key-get-usage.md)
 * if precise cost tracking becomes a priority.
 */
export const MODEL_ROSTER = [
	{
		id: "mistral/mistral-small-latest",
		label: "Mistral Small",
		description:
			"Fastest and most cost-efficient — the default for task summaries.",
		input: ["text"] as const,
		pricing: { inputPerMillion: 0.105, outputPerMillion: 0.315 },
	},
	{
		id: "mistral/mistral-medium-latest",
		label: "Mistral Medium",
		description:
			"Balanced quality and cost — used automatically when URL context is included.",
		input: ["text"] as const,
		pricing: { inputPerMillion: 0.42, outputPerMillion: 2.1 },
	},
	{
		id: "mistral/mistral-large-latest",
		label: "Mistral Large",
		description: "Highest quality, higher cost.",
		input: ["text"] as const,
		pricing: { inputPerMillion: 2.1, outputPerMillion: 6.3 },
	},
] as const;

export type RequestyModelId = (typeof MODEL_ROSTER)[number]["id"];

/**
 * Request metadata Requesty accepts for tracing/debugging a specific request
 * in their dashboard — https://docs.requesty.ai/features/request-metadata.
 * Sent as a top-level `requesty` key in the request body (Node.js SDK
 * convention); see `modelOptions` in client.ts/text.ts for how it gets there
 * via TanStack AI's `chat()`.
 */
export interface RequestyMetadata {
	/** Free-form labels for grouping related requests, e.g. ["task-summary"]. */
	tags?: string[];
	/** The Sayr user who triggered this request. */
	user_id?: string;
	/** Correlates this request with a Sayr OpenTelemetry trace — see getTraceContext() in @repo/opentelemetry/trace. */
	trace_id?: string;
	/** Arbitrary extra fields — org/task identifiers, etc. */
	extra?: Record<string, string | number | boolean | null | undefined>;
}

/** Provider options accepted by every model in the curated roster. */
export interface RequestyModelOptions {
	requesty?: RequestyMetadata;
}

/** Display catalog for the AI settings model picker (`apps/start`). */
export interface RequestyModelInfo {
	id: RequestyModelId;
	label: string;
	description: string;
}

export const REQUESTY_MODEL_CATALOG: readonly RequestyModelInfo[] =
	MODEL_ROSTER;

export const DEFAULT_MODEL_ID: RequestyModelId = MODEL_ROSTER[0].id;

/**
 * Validates a candidate model id against the curated catalog, falling back to
 * the default when it isn't recognised. Org settings are written through a
 * generic, unvalidated `organization/update` endpoint (see `@repo/util`'s
 * `OrgAiSettings.selectedModel` docs) — this is the point where a
 * client-supplied model id actually gets checked before it's ever used to
 * make a real (billed) request. Never pass a raw settings value straight to
 * `getRequestyAdapter` without going through this first.
 */
export function resolveModelId(
	candidateId: string | null | undefined,
): RequestyModelId {
	const match = MODEL_ROSTER.find((m) => m.id === candidateId);
	return match ? match.id : DEFAULT_MODEL_ID;
}

/**
 * The embedding model used for semantic search (task similarity, duplicate
 * detection) — see `embed.ts`. Unlike `MODEL_ROSTER`, this isn't routed
 * through Requesty: Requesty's routing policy for this account doesn't
 * currently offer an embedding model, so embeddings go direct to Mistral via
 * `@tanstack/ai-mistral`'s official adapter (still fully TanStack-AI-native,
 * just a second provider adapter alongside the Requesty one in client.ts).
 * Both id and dimension count confirmed live against the real API — Mistral
 * pins `mistral-embed` to a fixed 1024-dimension output (it rejects a
 * `dimensions` override, unlike `codestral-embed`).
 */
export const EMBEDDING_MODEL_ID = "mistral-embed";
export const EMBEDDING_DIMENSIONS = 1024;

/** Estimated USD cost for a completion — see the `pricing` doc comment above. */
export function estimateCostUsd(
	modelId: RequestyModelId,
	promptTokens: number,
	completionTokens: number,
): number {
	const model = MODEL_ROSTER.find((m) => m.id === modelId);
	if (!model) return 0;
	return (
		(promptTokens * model.pricing.inputPerMillion) / 1_000_000 +
		(completionTokens * model.pricing.outputPerMillion) / 1_000_000
	);
}
