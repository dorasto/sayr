import { createModel } from "@tanstack/ai";
import { openaiCompatible } from "@tanstack/ai-openai/compatible";
import { MODEL_ROSTER, type RequestyModelId, type RequestyModelOptions } from "./models.js";

/**
 * `MODEL_ROSTER` wrapped for `openaiCompatible`'s `models` catalog. The
 * `modelOptions` brand types `chat({ modelOptions })` against
 * `RequestyModelOptions` (request-metadata support) instead of falling back
 * to an untyped `Record<string, any>`.
 */
const REQUESTY_MODEL_DEFS = MODEL_ROSTER.map((m) =>
	createModel(m.id, { input: m.input, modelOptions: {} as RequestyModelOptions }),
);

const DEFAULT_REQUESTY_BASE_URL = "https://router.requesty.ai/v1";

/**
 * Requesty (https://requesty.ai) is an OpenAI-Chat-Completions-compatible
 * gateway — this is TanStack AI's generic `openaiCompatible` adapter
 * (`@tanstack/ai-openai/compatible`), the officially-documented pattern for
 * third-party OpenAI-compatible providers (DeepSeek, Together, Fireworks,
 * Ollama, etc — https://tanstack.com/ai/latest/docs/adapters/openai-compatible),
 * pointed at Requesty's router via `baseURL`.
 *
 * NOT `@tanstack/ai-openrouter`, even though Requesty markets itself as
 * "OpenRouter compatible" and that adapter's `provider/model` routing
 * convention matches: that package's stream parser validates every chunk
 * against a Zod schema codegen'd from OpenRouter's own OpenAPI spec, which
 * requires `finish_reason` to be present (`null` is fine, `undefined`/absent
 * is not) on every delta chunk. Requesty omits the key entirely until the
 * final chunk — standard, valid OpenAI streaming behavior, but it fails that
 * schema with a hard parse error and kills the whole stream. Confirmed live
 * (2026-08-19): every request reached Requesty and succeeded server-side,
 * but `@tanstack/ai-openrouter` rejected every response chunk before it ever
 * reached this app. `openaiCompatible` builds on `@tanstack/openai-base`
 * instead, which reads `finish_reason` with plain optional-chaining — no
 * schema to be stricter than the wire format actually is.
 *
 * Trade-off: `usage.cost` (a Requesty/OpenRouter response extension, not a
 * standard OpenAI field) isn't picked up by this adapter's usage builder —
 * see `MODEL_ROSTER`'s `pricing` field and `estimateCostUsd` in models.ts.
 */
let _requestyText: ReturnType<
	typeof openaiCompatible<typeof REQUESTY_MODEL_DEFS>
> | null = null;

function getRequestyFactory() {
	if (!_requestyText) {
		const apiKey = process.env.REQUESTY_API_KEY;
		if (!apiKey) {
			throw new Error("REQUESTY_API_KEY environment variable is not set");
		}
		_requestyText = openaiCompatible({
			name: "requesty",
			baseURL: process.env.REQUESTY_BASE_URL || DEFAULT_REQUESTY_BASE_URL,
			apiKey,
			models: REQUESTY_MODEL_DEFS,
		});
	}
	return _requestyText;
}

/**
 * Builds a TanStack AI text adapter for the given (already-validated) model.
 *
 * **Server-side only** — reads `process.env.REQUESTY_API_KEY`.
 */
export function getRequestyAdapter(modelId: RequestyModelId) {
	return getRequestyFactory()(modelId);
}
