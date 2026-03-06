import {
	type Edition,
	type PlanLimits,
	canCreate,
	getLimitsForEdition,
	getResourceLimitMessage,
	isOverLimit,
} from "@repo/edition";
import { useLayoutOrganization } from "@/contexts/ContextOrg";

type PlanLimitsReturn = {
	edition: Edition;
	isCloud: boolean;
	plan: string | null;
	limits: PlanLimits;
	counts: Record<keyof PlanLimits, number>;
	canCreateResource: (resource: keyof PlanLimits) => boolean;
	isOverLimit: (resource: keyof PlanLimits) => boolean;
	getLimitMessage: (resource: keyof PlanLimits) => string;
};

/**
 * Core logic shared by both hooks. Accepts pre-resolved data so it can
 * work with either the main org layout context or the settings context.
 */
function buildPlanLimits(data: {
	plan: string | null;
	memberCount: number;
	viewCount: number;
	issueTemplateCount: number;
	releaseCount: number;
}): PlanLimitsReturn {
	const edition = (import.meta.env.VITE_SAYR_EDITION ?? "community") as Edition;
	const limits = getLimitsForEdition(edition, data.plan);
	const isCloudEdition = edition === "cloud";

	const counts: Record<keyof PlanLimits, number> = {
		members: data.memberCount,
		savedViews: data.viewCount,
		issueTemplates: data.issueTemplateCount,
		teams: 0,
		releases: data.releaseCount,
	};

	return {
		edition,
		isCloud: isCloudEdition,
		plan: data.plan,
		limits,
		counts,
		canCreateResource: (resource: keyof PlanLimits) => canCreate(edition, resource, counts[resource], data.plan),
		isOverLimit: (resource: keyof PlanLimits) => isOverLimit(edition, resource, counts[resource], data.plan),
		getLimitMessage: (resource: keyof PlanLimits) => getResourceLimitMessage(edition, resource, data.plan),
	};
}

/**
 * Hook that provides plan limit information for the current organization.
 *
 * Uses the pure functions from @repo/edition (no process.env) so it is
 * safe to call in browser components.
 *
 * Edition is read from `import.meta.env.VITE_SAYR_EDITION` (baked at build time).
 * Plan is read from the organization context.
 * Counts are derived from the context arrays (views, issueTemplates, releases).
 */
export function usePlanLimits(): PlanLimitsReturn {
	const { organization, views, issueTemplates, releases } = useLayoutOrganization();

	return buildPlanLimits({
		plan: organization.plan,
		memberCount: organization.members.length,
		viewCount: views.length,
		issueTemplateCount: issueTemplates.length,
		releaseCount: releases.length,
	});
}

/**
 * Hook variant that accepts data directly instead of reading from the
 * main org layout context. Use this in settings pages where only
 * `useLayoutOrganizationSettings()` is available.
 */
export function usePlanLimitsFromData(data: {
	plan: string | null;
	memberCount: number;
	viewCount: number;
	issueTemplateCount: number;
	releaseCount: number;
}): PlanLimitsReturn {
	return buildPlanLimits(data);
}
