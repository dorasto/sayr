import { embed } from "@tanstack/ai";
import {
	type MistralEmbeddingAdapter,
	mistralEmbedding,
} from "@tanstack/ai-mistral";
import { EMBEDDING_MODEL_ID } from "./models.js";

/**
 * Lazy singleton for the Mistral embedding adapter — mirrors client.ts's
 * `getRequestyFactory()` pattern. Separate from the Requesty chat adapter:
 * Requesty's routing policy for this account has no embedding model enabled
 * (verified live), so embeddings go direct to Mistral via `@tanstack/ai-mistral`'s
 * official `mistralEmbedding()` adapter — a second TanStack AI provider
 * adapter, not a bypass of TanStack AI.
 *
 * **Server-side only** — reads `process.env.MISTRAL_API_KEY`.
 */
let _embeddingAdapter: MistralEmbeddingAdapter<
	typeof EMBEDDING_MODEL_ID
> | null = null;

function getEmbeddingAdapter() {
	if (!_embeddingAdapter) {
		if (!process.env.MISTRAL_API_KEY) {
			throw new Error("MISTRAL_API_KEY environment variable is not set");
		}
		// mistralEmbedding() reads MISTRAL_API_KEY from process.env itself.
		_embeddingAdapter = mistralEmbedding(EMBEDDING_MODEL_ID);
	}
	return _embeddingAdapter;
}

/** Embeds a single piece of text. Returns a 1024-dimension vector (see EMBEDDING_DIMENSIONS in models.ts). */
export async function embedText(text: string): Promise<number[]> {
	const result = await embed({ adapter: getEmbeddingAdapter(), input: text });
	const vector = result.embeddings[0]?.vector;
	if (!vector) {
		throw new Error("Mistral returned no embedding for the given text");
	}
	return vector;
}

/**
 * Embeds a batch of texts in a single request — used by the backfill script
 * so re-embedding existing tasks doesn't make one HTTP round trip per task.
 * Returns vectors in the same order as `texts`.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
	if (texts.length === 0) return [];
	const result = await embed({ adapter: getEmbeddingAdapter(), input: texts });
	// The backfill script persists per-task embeddings by index, so a provider
	// returning fewer/more vectors than inputs (partial response, dropped
	// input) would silently misalign vectors to the wrong tasks.
	if (result.embeddings.length !== texts.length) {
		throw new Error(
			`Mistral returned ${result.embeddings.length} embeddings for ${texts.length} inputs`,
		);
	}
	return result.embeddings.map((e) => e.vector);
}
