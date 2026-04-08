/**
 * Browser-safe utilities for resolving organization AI settings.
 * These types and helpers are shared between client and server code.
 *
 * NOTE: This file must remain free of Node.js-only imports so it can be
 * used in frontend (Vite/browser) bundles.
 */

/** Controls which fields public users may set when creating a task. */
export interface OrgAiRateLimit {
	/** ISO 8601 date-time string — rate limit is active until this moment. */
	until: string;
	/** Optional human-readable reason shown to admins. */
	reason?: string;
}

/** AI-feature settings for an organization. */
export interface OrgAiSettings {
	/**
	 * When true, all AI features are hidden entirely for this org.
	 * Takes precedence over rateLimited and individual feature flags.
	 */
	disabled: boolean;
	/**
	 * When set and `until` is in the future, AI generation is blocked but the
	 * UI shows a "temporarily unavailable" message instead of hiding the feature.
	 * Set to null to remove the rate limit.
	 */
	rateLimited: OrgAiRateLimit | null;
	/** When false, the AI task summary panel is hidden for this org. */
	taskSummary: boolean;
	/**
	 * Optional additional instructions appended to the system prompt for task summaries.
	 * Intended for tone and style guidance only (e.g. "Use formal language.").
	 * Sanitised and length-capped server-side before use — cannot override the base
	 * system prompt or inject into the task data user prompt.
	 */
	taskSummaryCustomPrompt?: string | null;
	/**
	 * When true, AI features that support URL fetching will embed external URLs
	 * found in task content as document chunks in the prompt, so the model can
	 * read the actual page content. Only takes effect for prompt configs where
	 * `capabilities.urlFetch` is true.
	 * Defaults to false — opt-in, as it incurs higher cost and latency.
	 */
	urlFetchEnabled?: boolean;
}

export const defaultOrgAiSettings: OrgAiSettings = {
	disabled: false,
	rateLimited: null,
	taskSummary: true,
	taskSummaryCustomPrompt: null,
	urlFetchEnabled: false,
};

/**
 * Resolves the effective AI status for an organization from its settings.
 *
 * Logic:
 * - `aiDisabled = true`    → hide all AI features entirely (disabled flag set)
 * - `aiRateLimited = true` → AI generation is blocked temporarily; show message
 * - both false             → AI is fully available
 *
 * Missing `ai` settings (older orgs) are treated as defaults (all enabled).
 */
export function resolveOrgAiStatus(settings: { ai?: OrgAiSettings | null } | null | undefined): {
	/** When true, all AI features should be hidden completely. */
	aiDisabled: boolean;
	/** When true, AI generation is temporarily blocked; show a rate-limit message. */
	aiRateLimited: boolean;
	/** The date until which the rate limit is active, or null if not rate-limited. */
	rateLimitUntil: Date | null;
	/** When false, the AI task summary feature should be hidden. */
	taskSummaryEnabled: boolean;
	/** When true, AI features that support URL fetching will embed external URLs found in task content. */
	urlFetchEnabled: boolean;
} {
	const ai = settings?.ai ?? defaultOrgAiSettings;

	if (ai.disabled) {
		return { aiDisabled: true, aiRateLimited: false, rateLimitUntil: null, taskSummaryEnabled: false, urlFetchEnabled: false };
	}

	if (ai.rateLimited) {
		const until = new Date(ai.rateLimited.until);
		if (until > new Date()) {
			return { aiDisabled: false, aiRateLimited: true, rateLimitUntil: until, taskSummaryEnabled: ai.taskSummary, urlFetchEnabled: ai.urlFetchEnabled ?? false };
		}
	}

	return {
		aiDisabled: false,
		aiRateLimited: false,
		rateLimitUntil: null,
		taskSummaryEnabled: ai.taskSummary,
		urlFetchEnabled: ai.urlFetchEnabled ?? false,
	};
}
