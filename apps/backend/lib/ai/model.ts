import { type RequestyModelId, resolveModelId } from "@repo/ai";
import type { PromptConfig } from "@repo/ai-prompts";
import type { schema } from "@repo/database";

/**
 * Resolves the model a request should use for a given AI feature.
 *
 * Mirrors the model-resolution logic in `summarize-task.ts`: a Pro-plan org
 * may override the prompt's default model via `OrgAiSettings.selectedModels`
 * (keyed per-feature by `promptConfig.id`). That value is untrusted (written
 * through a generic, unvalidated `organization/update` endpoint), so it is
 * always passed through `resolveModelId()` — never used directly — which
 * falls back to the curated catalog's default if it isn't a recognised id.
 *
 * Pass `preferUrlFetchModel: true` when the feature is about to embed
 * fetched URL content and the prompt declares a larger-context
 * `urlFetchModel` override; only takes effect when there is no org-selected
 * model (an explicit org choice always wins).
 */
export function resolveActiveModel(
	promptConfig: PromptConfig,
	orgSettings: schema.OrganizationWithMembers["settings"] | null | undefined,
	opts?: { preferUrlFetchModel?: boolean }
): RequestyModelId {
	const promptDefaultModel =
		opts?.preferUrlFetchModel && promptConfig.urlFetchModel ? promptConfig.urlFetchModel : promptConfig.model;

	const orgSelectedModel = orgSettings?.ai?.selectedModels?.[promptConfig.id];
	return orgSelectedModel ? resolveModelId(orgSelectedModel) : promptDefaultModel;
}

/**
 * Sanitises org-supplied text (custom instructions or an output template)
 * before it's appended to a feature's base system prompt.
 *
 * - Strips null bytes and ASCII control characters (preserves \n, \r, \t)
 * - Trims surrounding whitespace
 * - Enforces the given character cap
 * - Returns null for empty or whitespace-only input
 */
export function sanitizeCustomPrompt(input: string | null | undefined, maxLength: number): string | null {
	if (!input) return null;
	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — stripping control chars for prompt safety
	const stripped = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
	if (!stripped) return null;
	return stripped.slice(0, maxLength);
}

/**
 * Builds a feature's effective system prompt: the immutable base prompt,
 * optionally followed by an org-supplied output template (structure/section
 * guidance — only read when `promptConfig.maxTemplateLength` is set) and/or
 * org-supplied custom instructions (tone/style guidance). Both are appended
 * after the base prompt with an explicit separator so they can only add
 * guidance — they can never overwrite or precede the base instructions.
 */
export function buildEffectiveSystemPrompt(
	promptConfig: PromptConfig,
	orgSettings: schema.OrganizationWithMembers["settings"] | null | undefined
): string {
	const ai = orgSettings?.ai;
	let result = promptConfig.systemPrompt;

	const template = promptConfig.maxTemplateLength
		? sanitizeCustomPrompt(ai?.templates?.[promptConfig.id], promptConfig.maxTemplateLength)
		: null;
	if (template) {
		result += `\n\n---\nFollow this structure/template for the output:\n${template}`;
	}

	const custom = sanitizeCustomPrompt(ai?.customPrompts?.[promptConfig.id], promptConfig.maxCustomPromptLength);
	if (custom) {
		result += `\n\n---\nAdditional instructions from organization settings:\n${custom}`;
	}

	return result;
}
