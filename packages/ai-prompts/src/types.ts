import type { RequestyModelId } from "@repo/ai";

/** Capabilities that a prompt/feature may utilise. */
export interface PromptCapabilities {
	/**
	 * Whether this prompt supports URL fetching.
	 * When true and the org has URL fetching enabled, external URLs extracted
	 * from task content are fetched server-side and their text content is
	 * folded into the user prompt (see `fetchUrlAsText` in apps/backend) so
	 * the model can read the actual page content.
	 */
	urlFetch: boolean;
}

/**
 * The complete configuration for a single AI feature/prompt.
 *
 * Co-locates model choice, system prompt text, tuning parameters, and capability
 * flags in one place so route handlers never need to hardcode any of these values.
 */
export interface PromptConfig {
	/** Unique identifier used in logging, cache keys, and debug output. */
	id: string;
	/** Human-readable description surfaced in admin UIs and observability tooling. */
	description: string;
	/**
	 * The model to use for standard execution. Must be one of the models in
	 * `@repo/ai`'s curated Requesty catalog (see `resolveModelId`).
	 */
	model: RequestyModelId;
	/**
	 * Optional override model to use when URL fetching is active.
	 * Larger context windows may be needed when embedding external page content.
	 * Falls back to `model` if omitted.
	 */
	urlFetchModel?: RequestyModelId;
	/**
	 * The immutable base system prompt.
	 * Org-supplied custom instructions are appended after this string server-side
	 * with an explicit separator — they can never overwrite or precede it.
	 */
	systemPrompt: string;
	/** Maximum number of timeline items to include in the user prompt. */
	maxTimelineItems: number;
	/**
	 * Maximum number of external URLs to fetch and fold into the prompt as
	 * plain text per request. URLs are prioritised: description URLs first
	 * (in order of appearance), then comment URLs newest-first. Only URLs
	 * from the task description and user-written comments are considered —
	 * structured GitHub timeline events (commits, PRs, branches) are already
	 * represented as formatted text and are excluded to avoid
	 * double-processing their pages.
	 * Defaults to 3 if omitted.
	 */
	maxUrlFetchCount?: number;
	/**
	 * Maximum character length allowed for org-supplied custom instructions.
	 * Enforced server-side via sanitisation before appending to the system prompt.
	 */
	maxCustomPromptLength: number;
	/**
	 * Maximum character length allowed for an org-supplied output template
	 * (desired structure/sections, appended before custom instructions).
	 * Omitted or 0 means this feature doesn't support templates.
	 */
	maxTemplateLength?: number;
	/** Capability flags that determine which execution path is used. */
	capabilities: PromptCapabilities;
}
