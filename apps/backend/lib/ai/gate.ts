import { getOrganization, resolveOrgAiStatus, schema } from "@repo/database";
import { isAiEnabled, isAiAllowedForOrg } from "@repo/edition";
import { isAiFeatureEnabled } from "@repo/util";
import type { PromptConfig } from "@repo/ai-prompts";
import type { Context } from "hono";
import type { AppEnv } from "@/index";
import { traceOrgPermissionCheck } from "@/util";
import { errorResponse } from "../../responses";

export interface AiFeatureAccessOk {
	ok: true;
	org: schema.OrganizationWithMembers;
	aiStatus: ReturnType<typeof resolveOrgAiStatus>;
}

export interface AiFeatureAccessFail {
	ok: false;
	response: Response;
}

/**
 * Shared gate for every AI feature route.
 *
 * Collapses the sequence duplicated across `summarize-task.ts` and
 * `task-summary-status.ts` (session check → instance-level `isAiEnabled` →
 * org permission check → org lookup → Pro-plan check → org AI settings
 * check → per-feature toggle check) into a single call.
 *
 * `promptConfig.id` is checked against `OrgAiSettings.featureToggles`, the
 * generic per-feature enable map introduced alongside this helper — new
 * features opt into this automatically by having an `id`. The original
 * `task-summary` feature keeps using its own bespoke `taskSummaryEnabled`
 * field (see `resolveOrgAiStatus`) rather than being migrated onto
 * `featureToggles` here — that migration is a separate, deliberate future
 * step, not a side effect of adding new features.
 */
export async function checkAiFeatureAccess({
	c,
	session,
	orgId,
	promptConfig,
}: {
	c: Context<AppEnv>;
	session: { userId: string } | null | undefined;
	orgId: string;
	promptConfig: PromptConfig;
}): Promise<AiFeatureAccessOk | AiFeatureAccessFail> {
	if (!session?.userId) {
		return { ok: false, response: c.json(errorResponse("Unauthorized"), 401) };
	}

	if (!isAiEnabled()) {
		return {
			ok: false,
			response: c.json(
				errorResponse(
					"AI features are not available on this instance. Set REQUESTY_API_KEY to enable AI on self-hosted editions."
				),
				403
			),
		};
	}

	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "members");
	if (!isAuthorized) {
		return { ok: false, response: c.json(errorResponse("Permission denied"), 403) };
	}

	const org = await getOrganization(orgId, session.userId);
	if (!org) {
		return { ok: false, response: c.json(errorResponse("Organization not found"), 404) };
	}

	// On cloud, AI is a Pro plan feature. Self-hosted instances are unrestricted
	// (availability is already controlled by REQUESTY_API_KEY via isAiEnabled()).
	if (!isAiAllowedForOrg(org.plan ?? null)) {
		return {
			ok: false,
			response: c.json(
				errorResponse("AI features are only available on the Pro plan. Please upgrade to access this feature."),
				403
			),
		};
	}

	const aiStatus = resolveOrgAiStatus(org.settings ?? null);
	if (aiStatus.aiDisabled) {
		return { ok: false, response: c.json(errorResponse("AI features are disabled for this organization"), 403) };
	}
	if (aiStatus.aiRateLimited) {
		return {
			ok: false,
			response: c.json(
				{
					success: false,
					error: "AI features are temporarily rate limited for this organization",
					until: aiStatus.rateLimitUntil?.toISOString(),
				},
				429
			),
		};
	}

	if (!isAiFeatureEnabled(org.settings ?? null, promptConfig.id)) {
		return {
			ok: false,
			response: c.json(errorResponse(`This AI feature is disabled for this organization`), 403),
		};
	}

	return { ok: true, org, aiStatus };
}
