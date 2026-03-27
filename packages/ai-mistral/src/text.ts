import { getMistralClient } from "./client.js";
import { MISTRAL_MODELS, type MistralModel } from "./model-meta.js";

export interface GenerateTextOptions {
	model?: MistralModel;
	systemPrompt: string;
	userPrompt: string;
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

export async function* streamText(options: GenerateTextOptions): AsyncGenerator<string> {
	const { model = MISTRAL_MODELS.SMALL, systemPrompt, userPrompt } = options;
	const client = getMistralClient();

	const stream = await client.chat.stream({
		model,
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userPrompt },
		],
	});

	for await (const chunk of stream) {
		const delta = chunk.data.choices[0]?.delta?.content;
		if (typeof delta === "string" && delta.length > 0) {
			yield delta;
		}
	}
}
