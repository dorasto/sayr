import type { MistralModel } from "@repo/ai-mistral";

/** Capabilities that a prompt/feature may utilise. */
export interface PromptCapabilities {
	/**
	 * Whether this prompt supports URL fetching via DocumentURLChunk.
	 * When true and the org has URL fetching enabled, external URLs extracted
	 * from task content are embedded as document chunks in the user message so
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
	 * The Mistral model to use for standard execution.
	 */
	model: MistralModel;
	/**
	 * Optional override model to use when URL fetching is active.
	 * Larger context windows may be needed when embedding external page content.
	 * Falls back to `model` if omitted.
	 */
	urlFetchModel?: MistralModel;
	/**
	 * The immutable base system prompt.
	 * Org-supplied custom instructions are appended after this string server-side
	 * with an explicit separator — they can never overwrite or precede it.
	 */
	systemPrompt: string;
	/** Maximum number of timeline items to include in the user prompt. */
	maxTimelineItems: number;
	/**
	 * Maximum number of external URLs to embed as DocumentURLChunks per request.
	 * URLs are prioritised: description URLs first (in order of appearance), then
	 * comment URLs newest-first. Only URLs from the task description and
	 * user-written comments are considered — structured GitHub timeline events
	 * (commits, PRs, branches) are already represented as formatted text and are
	 * excluded to avoid double-processing their pages.
	 * Defaults to 3 if omitted.
	 */
	maxUrlFetchCount?: number;
	/**
	 * Maximum character length allowed for org-supplied custom instructions.
	 * Enforced server-side via sanitisation before appending to the system prompt.
	 */
	maxCustomPromptLength: number;
	/** Capability flags that determine which execution path is used. */
	capabilities: PromptCapabilities;
}
