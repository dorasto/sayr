import { MISTRAL_MODELS } from "@repo/ai-mistral";
import type { PromptConfig } from "../types.js";

/**
 * Prompt configuration for the AI label suggestion feature.
 *
 * Analyses a task's title, description and existing labels to suggest
 * relevant labels from the organisation's label library.
 *
 * @todo Implement the system prompt and wire up the route when the
 *       /suggest-labels endpoint is built.
 */
export const suggestLabelsPrompt: PromptConfig = {
	id: "suggest-labels",
	description: "Suggests relevant labels for a task based on its content and the organisation's label library.",
	model: MISTRAL_MODELS.SMALL,
	// TODO: Implement system prompt when the suggest-labels route is built.
	systemPrompt: "",
	maxTimelineItems: 0,
	maxCustomPromptLength: 0,
	capabilities: {
		urlFetch: false,
	},
};
