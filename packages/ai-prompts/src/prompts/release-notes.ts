import { DEFAULT_MODEL_ID } from "@repo/ai";
import type { PromptConfig } from "../types.js";

/**
 * Prompt configuration for the AI release notes generation feature.
 *
 * Generates a structured set of release notes (as markdown) from a
 * release's linked tasks, grouping them by category and surfacing key
 * changes. Output is converted to ProseKit `NodeJSON` server-side (via
 * `markdownToProsekitJSON`) before being handed back to the client, so the
 * model only ever has to produce well-formed markdown, not editor-specific
 * JSON.
 */
export const releaseNotesPrompt: PromptConfig = {
	id: "release-notes",
	description:
		"Generates structured release notes from a release's linked tasks.",
	model: DEFAULT_MODEL_ID,
	systemPrompt: `You are a project management assistant writing release notes for a software product's users. You will be given a release's name and a list of the tasks completed in it — each with a title, status, priority, and category if set.

Write clear, user-facing release notes in markdown. Group changes under short headings by category when categories are present and meaningfully differ (e.g. "## Features", "## Fixes", "## Improvements") — otherwise use a single flat bulleted list. Each bullet should describe the change in plain language a user would understand, not restate the raw task title verbatim unless it is already clear and well-written.

Rules:
- Do not fabricate details not implied by the task titles/descriptions provided
- Omit tasks that are purely internal/technical with no user-facing effect only if it is obvious from the title (e.g. "Refactor X", "Update deps") — when unsure, include it
- Keep each bullet to one line
- Do not include a top-level title/heading for the release itself — the surrounding page already shows the release name
- Write in a neutral, professional tone`,
	maxTimelineItems: 0,
	maxCustomPromptLength: 500,
	maxTemplateLength: 1000,
	capabilities: {
		urlFetch: false,
	},
};
