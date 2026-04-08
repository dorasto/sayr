import { getMistralClient } from "./client.js";
import { MISTRAL_MODELS, type MistralModel } from "./model-meta.js";

export interface GenerateTextOptions {
	model?: MistralModel;
	systemPrompt: string;
	userPrompt: string;
	/**
	 * Optional list of external URLs to embed as DocumentURLChunks in the user
	 * message so the model can read the actual page content.
	 * When provided the user message becomes a ContentChunk array rather than a
	 * plain string: one DocumentURLChunk per URL followed by a TextChunk
	 * containing the user prompt.
	 */
	urls?: string[];
}

export interface StreamTokenUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
}

export type StreamChunk =
	| { type: "chunk"; text: string }
	| { type: "done"; usage: StreamTokenUsage; urlFetchUsed: boolean };

export async function generateText(options: GenerateTextOptions): Promise<string> {
	const { model = MISTRAL_MODELS.SMALL, systemPrompt, userPrompt } = options;
	const client = getMistralClient();

	const response = await client.chat.complete({
		model,
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userPrompt },
		],
	});

	const content = response.choices?.[0]?.message?.content;
	if (!content) {
		throw new Error("Mistral returned an empty response");
	}

	return typeof content === "string" ? content : content.map((c) => ("text" in c ? c.text : "")).join("");
}

/**
 * Streams a Mistral chat completion and yields `StreamChunk` values.
 *
 * When `urls` are provided, the user message is built as a `ContentChunk`
 * array: one `document_url` chunk per URL (so the model fetches and reads
 * each page) followed by a `text` chunk containing the actual user prompt.
 * This is the DocumentURLChunk path — no conversations API, no tool use.
 */
export async function* streamText(options: GenerateTextOptions): AsyncGenerator<StreamChunk> {
	const { model = MISTRAL_MODELS.SMALL, systemPrompt, userPrompt, urls } = options;
	const client = getMistralClient();

	const urlFetchUsed = (urls?.length ?? 0) > 0;

	// Build the user message content: plain string OR DocumentURLChunks + text.
	const userContent = urlFetchUsed
		? [
				...(urls ?? []).map((url) => ({
					type: "document_url" as const,
					documentUrl: url,
				})),
				{ type: "text" as const, text: userPrompt },
			]
		: userPrompt;

	if (urlFetchUsed) {
		console.log(`[ai-mistral:streamText] url-fetch path — model=${model} urls=${(urls ?? []).length}`);
	}

	const stream = await client.chat.stream({
		model,
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userContent },
		],
	});

	let lastUsage: StreamTokenUsage | null = null;

	for await (const chunk of stream) {
		const delta = chunk.data.choices[0]?.delta?.content;
		if (typeof delta === "string" && delta.length > 0) {
			yield { type: "chunk", text: delta };
		}

		// Mistral returns usage on the final chunk of the stream
		const usage = chunk.data.usage;
		if (usage) {
			lastUsage = {
				promptTokens: usage.promptTokens ?? 0,
				completionTokens: usage.completionTokens ?? 0,
				totalTokens: usage.totalTokens ?? 0,
			};
		}
	}

	yield {
		type: "done",
		usage: lastUsage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
		urlFetchUsed,
	};
}
