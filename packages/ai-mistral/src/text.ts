import { getMistralClient } from "./client.js";
import { MISTRAL_MODELS, type MistralModel } from "./model-meta.js";

export interface GenerateTextOptions {
	model?: MistralModel;
	systemPrompt: string;
	userPrompt: string;
}

export interface StreamTokenUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
}

export type StreamChunk =
	| { type: "chunk"; text: string }
	| { type: "done"; usage: StreamTokenUsage };

export interface StreamAgentOptions {
	/** The Mistral agent ID to run (created via client.beta.agents.create). */
	agentId: string;
	/** The user input / prompt to send to the agent. */
	inputs: string;
}

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

export async function* streamText(options: GenerateTextOptions): AsyncGenerator<StreamChunk> {
	const { model = MISTRAL_MODELS.SMALL, systemPrompt, userPrompt } = options;
	const client = getMistralClient();

	const stream = await client.chat.stream({
		model,
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userPrompt },
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
	};
}

/**
 * Runs a pre-created Mistral agent (e.g. one with `web_search` enabled) and
 * streams the response back as the same `StreamChunk` type used by `streamText`.
 *
 * The agent must already exist on the Mistral platform. Use
 * `client.beta.agents.create({ tools: [{ type: "web_search" }], ... })` to
 * provision one and persist the returned `agentId`.
 *
 * Usage tokens are not always available from the conversations streaming API
 * — they default to zero when absent rather than blocking the stream.
 */
export async function* streamAgent(options: StreamAgentOptions): AsyncGenerator<StreamChunk> {
	const { agentId, inputs } = options;
	const client = getMistralClient();

	const stream = await client.beta.conversations.startStream({
		agentId,
		inputs,
	});

	let lastUsage: StreamTokenUsage | null = null;

	for await (const event of stream) {
		// The conversations streaming API emits typed events. We care about
		// message delta events that carry text content.
		const eventType = (event as { type?: string }).type;

		if (eventType === "conversation.response.delta") {
			const delta = (event as { delta?: { content?: string } }).delta?.content;
			if (typeof delta === "string" && delta.length > 0) {
				yield { type: "chunk", text: delta };
			}
		}

		// Capture usage if the API surfaces it on a done/complete event.
		if (eventType === "conversation.response.done") {
			const usage = (event as { usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }).usage;
			if (usage) {
				lastUsage = {
					promptTokens: usage.promptTokens ?? 0,
					completionTokens: usage.completionTokens ?? 0,
					totalTokens: usage.totalTokens ?? 0,
				};
			}
		}
	}

	yield {
		type: "done",
		usage: lastUsage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
	};
}
