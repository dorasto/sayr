import { chat } from "@tanstack/ai";
import { getRequestyAdapter } from "./client.js";
import {
	DEFAULT_MODEL_ID,
	estimateCostUsd,
	type RequestyMetadata,
	type RequestyModelId,
} from "./models.js";

export interface GenerateTextOptions {
	model?: RequestyModelId;
	systemPrompt: string;
	userPrompt: string;
	/**
	 * Optional pre-fetched, pre-formatted context to append to the user
	 * prompt (e.g. the text content of URLs found in a task description —
	 * see `fetchUrlAsText`). Plain text, not a provider-specific content
	 * chunk — this works identically across every model/provider, unlike
	 * Mistral's `document_url` chunks it replaces, which had no equivalent
	 * once other models entered the mix.
	 */
	extraContext?: string;
	/**
	 * Optional Requesty request metadata (who/what/trace) — surfaced in
	 * Requesty's own dashboard for tracing/debugging a specific request. See
	 * `RequestyMetadata`'s doc comment in models.ts.
	 */
	requestyMetadata?: RequestyMetadata;
}

export interface StreamTokenUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	/** Estimated USD cost — see `estimateCostUsd`'s doc comment in models.ts. */
	cost?: number;
}

export type StreamChunk =
	| { type: "chunk"; text: string }
	| { type: "done"; usage: StreamTokenUsage };

function buildUserContent(userPrompt: string, extraContext?: string): string {
	if (!extraContext) return userPrompt;
	return `${userPrompt}\n\n---\nAdditional context from linked URLs:\n${extraContext}`;
}

export async function generateText(
	options: GenerateTextOptions,
): Promise<string> {
	const {
		model = DEFAULT_MODEL_ID,
		systemPrompt,
		userPrompt,
		extraContext,
		requestyMetadata,
	} = options;

	const stream = chat({
		adapter: getRequestyAdapter(model),
		systemPrompts: [systemPrompt],
		messages: [
			{ role: "user", content: buildUserContent(userPrompt, extraContext) },
		],
		modelOptions: requestyMetadata ? { requesty: requestyMetadata } : undefined,
	});

	let text = "";
	for await (const event of stream) {
		if (event.type === "TEXT_MESSAGE_CONTENT" && event.delta) {
			text += event.delta;
		}
	}

	if (!text) {
		throw new Error("Requesty returned an empty response");
	}
	return text;
}

/**
 * Streams a chat completion through Requesty (via TanStack AI's
 * openaiCompatible adapter — see client.ts) and yields `StreamChunk` values.
 *
 * Consumes `chat()`'s AG-UI event stream internally and re-yields it as this
 * package's own minimal `StreamChunk` shape — callers (e.g. the task-summary
 * route) keep their existing SSE wire protocol, cache-replay, and billing
 * logic untouched; only what happens inside this generator changed provider.
 */
export async function* streamText(
	options: GenerateTextOptions,
): AsyncGenerator<StreamChunk> {
	const {
		model = DEFAULT_MODEL_ID,
		systemPrompt,
		userPrompt,
		extraContext,
		requestyMetadata,
	} = options;

	const stream = chat({
		adapter: getRequestyAdapter(model),
		systemPrompts: [systemPrompt],
		messages: [
			{ role: "user", content: buildUserContent(userPrompt, extraContext) },
		],
		modelOptions: requestyMetadata ? { requesty: requestyMetadata } : undefined,
	});

	let usage: StreamTokenUsage = {
		promptTokens: 0,
		completionTokens: 0,
		totalTokens: 0,
	};

	for await (const event of stream) {
		if (event.type === "TEXT_MESSAGE_CONTENT" && event.delta) {
			yield { type: "chunk", text: event.delta };
		} else if (event.type === "RUN_FINISHED") {
			if (event.usage) {
				const promptTokens = event.usage.promptTokens ?? 0;
				const completionTokens = event.usage.completionTokens ?? 0;
				usage = {
					promptTokens,
					completionTokens,
					totalTokens: event.usage.totalTokens ?? 0,
					cost: estimateCostUsd(model, promptTokens, completionTokens),
				};
			}
		} else if (event.type === "RUN_ERROR") {
			throw new Error(event.error?.message || "Requesty stream failed");
		}
	}

	yield { type: "done", usage };
}
