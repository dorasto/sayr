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
	 * When true, AI features that support URL fetching will fetch external URLs
	 * found in task content server-side and fold their text content into the
	 * prompt. Only takes effect for prompt configs where `capabilities.urlFetch`
	 * is true.
	 * Defaults to false — opt-in, as it incurs higher cost and latency.
	 */
	urlFetchEnabled?: boolean;
	/**
	 * Pro-plan orgs may pick a specific model per AI feature (a Requesty model
	 * id, see `@repo/ai`'s `REQUESTY_MODEL_CATALOG`) to use instead of that
	 * feature's prompt default — keyed by the feature's `PromptConfig.id`
	 * (`@repo/ai-prompts`, e.g. `"task-summary"`), one entry per feature.
	 * Free-plan orgs never reach this — `isAiAllowedForOrg` gates AI access
	 * before this field is ever read.
	 *
	 * IMPORTANT: this is written through a generic, unvalidated
	 * `organization/update` endpoint (no server-side schema check on
	 * `settings.ai` — see apps/backend/routes/api/internal/v1/organization.ts),
	 * so a stored value here is untrusted input. Always resolve it through
	 * `@repo/ai`'s `resolveModelId()` before using it to make a request —
	 * never pass it to a provider call directly.
	 */
	selectedModels?: Record<string, string>;
	/**
	 * Per-feature enable toggles for AI features added after task-summary,
	 * keyed by the feature's `PromptConfig.id` (`@repo/ai-prompts`, e.g.
	 * `"suggest-labels"`). Missing entry = enabled (opt-out model, matching
	 * `taskSummary`'s default-on behaviour). `taskSummary` itself keeps its
	 * own dedicated `taskSummary` boolean above rather than moving onto this
	 * map — this field is only for features built on top of it.
	 * Checked via `isAiFeatureEnabled` below.
	 */
	featureToggles?: Record<string, boolean>;
}

export const defaultOrgAiSettings: OrgAiSettings = {
	disabled: false,
	rateLimited: null,
	taskSummary: true,
	taskSummaryCustomPrompt: null,
	urlFetchEnabled: false,
	selectedModels: {},
	featureToggles: {},
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
	const ai: OrgAiSettings = { ...defaultOrgAiSettings, ...(settings?.ai ?? {}) };

	if (ai.disabled) {
		return {
			aiDisabled: true,
			aiRateLimited: false,
			rateLimitUntil: null,
			taskSummaryEnabled: false,
			urlFetchEnabled: false,
		};
	}

	if (ai.rateLimited) {
		const until = new Date(ai.rateLimited.until);
		if (until > new Date()) {
			return {
				aiDisabled: false,
				aiRateLimited: true,
				rateLimitUntil: until,
				taskSummaryEnabled: ai.taskSummary,
				urlFetchEnabled: ai.urlFetchEnabled ?? false,
			};
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

/**
 * Whether a given AI feature (identified by its `PromptConfig.id`) is
 * enabled for an organization, per `OrgAiSettings.featureToggles`.
 *
 * This only checks the per-feature toggle — callers must separately check
 * `resolveOrgAiStatus(settings).aiDisabled`/`aiRateLimited` first (as
 * `checkAiFeatureAccess` in `apps/backend/lib/ai/gate.ts` does) since those
 * take precedence over any individual feature toggle.
 *
 * Not used for `taskSummary` — that feature keeps its own dedicated
 * `taskSummaryEnabled` field on `resolveOrgAiStatus`'s return value.
 */
export function isAiFeatureEnabled(
	settings: { ai?: OrgAiSettings | null } | null | undefined,
	featureId: string
): boolean {
	const ai: OrgAiSettings = { ...defaultOrgAiSettings, ...(settings?.ai ?? {}) };
	return ai.featureToggles?.[featureId] ?? true;
}
