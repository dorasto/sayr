import type { MistralModel } from "@repo/ai-mistral";

/** Capabilities that a prompt/feature may utilise. */
export interface PromptCapabilities {
	/**
	 * Whether this prompt supports Mistral web search.
	 * When true and the org has web search enabled, the agent execution path
	 * is used instead of the plain chat path (requires medium+ model).
	 */
	webSearch: boolean;
}

/**
 * The complete configuration for a single AI feature/prompt.
 *
 * Co-locates model choice, system prompt text, tuning parameters, and
 * capability flags in one place so route handlers never need to hardcode
 * any of these values.
 */
export interface PromptConfig {
	/** Unique identifier used in logging, cache keys, and debug output. */
	id: string;
	/** Human-readable description surfaced in admin UIs and observability tooling. */
	description: string;
	/**
	 * The Mistral model to use for standard (non-agent) execution.
	 * Overridden by webSearchModel when the agent path is active.
	 */
	model: MistralModel;
	/**
	 * The model to use when the agent/web-search path is active.
	 * Must be mistral-medium-latest or mistral-large-latest — web search is
	 * not supported on mistral-small.
	 * Falls back to `model` if omitted, which effectively disables web search
	 * even if the capability flag is true.
	 */
	webSearchModel?: MistralModel;
	/**
	 * The immutable base system prompt.
	 * Org-supplied custom instructions are appended after this string server-side
	 * with an explicit separator — they can never overwrite or precede it.
	 */
	systemPrompt: string;
	/** Maximum number of timeline items to include in the user prompt. */
	maxTimelineItems: number;
	/**
	 * Maximum character length allowed for org-supplied custom instructions.
	 * Enforced server-side via sanitisation before appending to the system prompt.
	 */
	maxCustomPromptLength: number;
	/** Capability flags that determine which execution path and tools are used. */
	capabilities: PromptCapabilities;
}
