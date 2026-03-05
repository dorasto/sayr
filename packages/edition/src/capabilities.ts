import { getEdition } from "./edition";
import type { Edition, EditionCapabilities, PlanLimits } from "./types";

// ---------------------------------------------------------------------------
// Edition-level capabilities (instance-wide, not per-org)
// ---------------------------------------------------------------------------

const EDITION_CAPABILITIES: Record<Edition, EditionCapabilities> = {
	cloud: {
		maxOrganizations: null,
		polarBillingEnabled: true,
		dorasOAuthEnabled: true,
		axiomTelemetryEnabled: true,
		marketingSiteEnabled: true,
		multiTenantEnabled: true,
	},
	community: {
		maxOrganizations: 1,
		polarBillingEnabled: false,
		dorasOAuthEnabled: false,
		axiomTelemetryEnabled: false,
		marketingSiteEnabled: false,
		multiTenantEnabled: false,
	},
	enterprise: {
		// Enterprise defaults -- will be configurable via license key metadata
		maxOrganizations: null,
		polarBillingEnabled: false,
		dorasOAuthEnabled: false,
		axiomTelemetryEnabled: false,
		marketingSiteEnabled: false,
		multiTenantEnabled: false,
	},
};

/**
 * Get the capabilities for the current edition.
 */
export function getEditionCapabilities(): EditionCapabilities {
	return EDITION_CAPABILITIES[getEdition()];
}

// ---------------------------------------------------------------------------
// Plan-level limits (per-org, based on organization's plan field)
// ---------------------------------------------------------------------------

/**
 * Limits for cloud plans (free and pro tiers).
 * On self-hosted editions, these are not used -- everything is unlimited.
 */
const CLOUD_PLAN_LIMITS: Record<string, PlanLimits> = {
	free: {
		members: 5,
		savedViews: 3,
		issueTemplates: 3,
		teams: 1,
		releases: 0,
	},
	pro: {
		members: 1000,
		savedViews: null,
		issueTemplates: null,
		teams: null,
		releases: null,
	},
};

/**
 * Self-hosted editions get unlimited everything.
 * The only limits on self-hosted are at the edition level (e.g. max orgs).
 */
const SELF_HOSTED_LIMITS: PlanLimits = {
	members: 1000,
	savedViews: null,
	issueTemplates: null,
	teams: null,
	releases: null,
};

const FREE_LIMITS: PlanLimits = {
	members: 5,
	savedViews: 3,
	issueTemplates: 3,
	teams: 1,
	releases: 0,
};

/**
 * Get the effective resource limits for an organization, taking into account
 * both the edition and the organization's plan.
 *
 * - Cloud: limits come from the org's plan (free/pro)
 * - Community/Enterprise: everything is unlimited (self-hosted plan)
 */
export function getEffectiveLimits(plan: string | null | undefined): PlanLimits {
	const edition = getEdition();

	// Self-hosted editions: everything unlimited regardless of plan field
	if (edition === "community" || edition === "enterprise") {
		return SELF_HOSTED_LIMITS;
	}

	// Cloud: use plan-based limits
	const key = plan ?? "free";
	return CLOUD_PLAN_LIMITS[key] ?? FREE_LIMITS;
}

/**
 * Check if a specific resource can be created given the current count and plan.
 * Returns `true` if creation is allowed, `false` if the limit would be exceeded.
 */
export function canCreateResource(
	resource: keyof PlanLimits,
	currentCount: number,
	plan: string | null | undefined,
): boolean {
	const limits = getEffectiveLimits(plan);
	const limit = limits[resource];

	// null = unlimited
	if (limit === null) {
		return true;
	}

	return currentCount < limit;
}

/**
 * Get a human-readable error message when a resource limit is reached.
 */
export function getLimitReachedMessage(resource: keyof PlanLimits, plan: string | null | undefined): string {
	const limits = getEffectiveLimits(plan);
	const limit = limits[resource];

	if (limit === 0) {
		return `${formatResourceName(resource)} are not available on the ${plan ?? "free"} plan. Please upgrade to unlock this feature.`;
	}

	return `You've reached the maximum of ${limit} ${formatResourceName(resource).toLowerCase()} on the ${plan ?? "free"} plan. Please upgrade to add more.`;
}

function formatResourceName(resource: keyof PlanLimits): string {
	switch (resource) {
		case "members":
			return "Members";
		case "savedViews":
			return "Saved views";
		case "issueTemplates":
			return "Issue templates";
		case "teams":
			return "Teams";
		case "releases":
			return "Releases";
	}
}
