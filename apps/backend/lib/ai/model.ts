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
