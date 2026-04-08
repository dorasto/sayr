import { MISTRAL_MODELS } from "@repo/ai-mistral";
import type { PromptConfig } from "../types.js";

/**
 * Prompt configuration for the AI release notes generation feature.
 *
 * Generates a structured set of release notes from a milestone's completed
 * tasks, grouping them by category and surfacing key changes.
 *
 * @todo Implement the system prompt and wire up the route when the
 *       /release-notes endpoint is built.
 */
export const releaseNotesPrompt: PromptConfig = {
	id: "release-notes",
	description: "Generates structured release notes from a milestone's completed tasks.",
	model: MISTRAL_MODELS.SMALL,
	// TODO: Implement system prompt when the release-notes route is built.
	systemPrompt: "",
	maxTimelineItems: 0,
	maxCustomPromptLength: 500,
	capabilities: {
		urlFetch: false,
	},
};
