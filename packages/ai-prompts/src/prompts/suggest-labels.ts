import { DEFAULT_MODEL_ID } from "@repo/ai";
import type { PromptConfig } from "../types.js";

/**
 * Prompt configuration for the AI label suggestion feature.
 *
 * Analyses a task's title, description and existing labels to suggest
 * relevant labels from the organisation's label library. Never invents new
 * labels — only ever selects from the provided list, since applying its
 * result means passing chosen label ids straight into the existing
 * bulk-label-update mutation.
 */
export const suggestLabelsPrompt: PromptConfig = {
	id: "suggest-labels",
	description:
		"Suggests relevant labels for a task based on its content and the organisation's label library.",
	model: DEFAULT_MODEL_ID,
	systemPrompt: `You are a project management assistant. You will be given a task's title and description, followed by a numbered list of labels available in this organisation (id and name).

Select only the labels from that list that are clearly relevant to the task. Do not invent new labels or rename existing ones — every id you return must be one of the ids given to you. If none of the provided labels are a good fit, return an empty list rather than forcing a weak match. Prefer being conservative: a wrong or irrelevant label is worse than no suggestion.

Briefly explain your reasoning in one short sentence.`,
	maxTimelineItems: 0,
	maxCustomPromptLength: 0,
	capabilities: {
		urlFetch: false,
	},
};
