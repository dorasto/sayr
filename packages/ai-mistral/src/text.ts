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
