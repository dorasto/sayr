import { getEdition } from "./edition";
import type { Edition, EditionCapabilities, PlanLimits } from "./types";

// ---------------------------------------------------------------------------
// Edition-level capabilities (instance-wide, not per-org)
// ---------------------------------------------------------------------------

const EDITION_CAPABILITIES: Record<Edition, EditionCapabilities> = {
	cloud: {
		maxOrganizations: null,
		polarBillingEnabled: false,
		dorasOAuthEnabled: true,
		axiomTelemetryEnabled: true,
		marketingSiteEnabled: true,
		multiTenantEnabled: true,
		clickhouseEnabled: true,
	},
	community: {
		maxOrganizations: 1,
		polarBillingEnabled: false,
		dorasOAuthEnabled: false,
		axiomTelemetryEnabled: false,
		marketingSiteEnabled: false,
		multiTenantEnabled: false,
		clickhouseEnabled: false,
	},
	enterprise: {
		// Enterprise defaults -- will be configurable via license key metadata
		maxOrganizations: null,
		polarBillingEnabled: false,
		dorasOAuthEnabled: false,
		axiomTelemetryEnabled: false,
		marketingSiteEnabled: false,
		multiTenantEnabled: false,
		clickhouseEnabled: false,
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
export const CLOUD_PLAN_LIMITS: Record<string, PlanLimits> = {
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
export const SELF_HOSTED_LIMITS: PlanLimits = {
	members: 1000,
	savedViews: null,
	issueTemplates: null,
	teams: null,
	releases: null,
};

export const FREE_LIMITS: PlanLimits = {
	members: 5,
	savedViews: 3,
	issueTemplates: 3,
	teams: 1,
	releases: 0,
};

// ---------------------------------------------------------------------------
// Pure functions (no process.env -- safe for browser use)
// ---------------------------------------------------------------------------

/**
 * Get the effective resource limits for an organization given a known edition.
 *
 * This is a **pure function** -- it does not read process.env or call getEdition().
 * Safe to use in both server and browser contexts.
 *
 * @param edition - The Sayr edition (cloud, community, enterprise)
 * @param plan - The organization's plan (free, pro, etc.)
 */
export function getLimitsForEdition(edition: Edition, plan: string | null | undefined): PlanLimits {
	// Self-hosted editions: everything unlimited regardless of plan field
	if (edition === "community" || edition === "enterprise") {
		return SELF_HOSTED_LIMITS;
	}

	// Cloud: use plan-based limits
	const key = plan ?? "free";
	return CLOUD_PLAN_LIMITS[key] ?? FREE_LIMITS;
}

/**
 * Check if a specific resource can be created given the current count, edition, and plan.
 * Returns `true` if creation is allowed, `false` if the limit would be exceeded.
 *
 * Pure function -- safe for browser use.
 */
export function canCreate(
	edition: Edition,
	resource: keyof PlanLimits,
	currentCount: number,
	plan: string | null | undefined,
): boolean {
	const limits = getLimitsForEdition(edition, plan);
	const limit = limits[resource];

	// null = unlimited
	if (limit === null) {
		return true;
	}

	return currentCount < limit;
}

/**
 * Check if a resource is currently over its plan limit.
 * When over limit, both creation AND editing should be blocked
 * (user must delete to get back under).
 *
 * Pure function -- safe for browser use.
 */
export function isOverLimit(
	edition: Edition,
	resource: keyof PlanLimits,
	currentCount: number,
	plan: string | null | undefined,
): boolean {
	const limits = getLimitsForEdition(edition, plan);
	const limit = limits[resource];

	// null = unlimited, never over limit
	if (limit === null) {
		return false;
	}

	return currentCount > limit;
}

/**
 * Get a human-readable error message when a resource limit is reached.
 *
 * Pure function -- safe for browser use.
 */
export function getResourceLimitMessage(
	edition: Edition,
	resource: keyof PlanLimits,
	plan: string | null | undefined,
): string {
	const limits = getLimitsForEdition(edition, plan);
	const limit = limits[resource];

	if (limit === 0) {
		return `${formatResourceName(resource)} are not available on the ${plan ?? "free"} plan. Please upgrade to unlock this feature.`;
	}

	return `You've reached the maximum of ${limit} ${formatResourceName(resource).toLowerCase()} on the ${plan ?? "free"} plan. Please upgrade to add more.`;
}

// ---------------------------------------------------------------------------
// Server-side convenience wrappers (use getEdition() internally)
// These call process.env via getEdition() -- do NOT use in browser code.
// For browser use, call the pure functions above with an explicit edition.
// ---------------------------------------------------------------------------

/**
 * Get the effective resource limits for an organization, taking into account
 * both the edition and the organization's plan.
 *
 * **Server-side only** -- calls getEdition() which reads process.env.
 * For browser use, call getLimitsForEdition(edition, plan) instead.
 */
export function getEffectiveLimits(plan: string | null | undefined): PlanLimits {
	return getLimitsForEdition(getEdition(), plan);
}

/**
 * Check if a specific resource can be created given the current count and plan.
 * Returns `true` if creation is allowed, `false` if the limit would be exceeded.
 *
 * **Server-side only** -- calls getEdition() which reads process.env.
 * For browser use, call canCreate(edition, resource, count, plan) instead.
 */
export function canCreateResource(
	resource: keyof PlanLimits,
	currentCount: number,
	plan: string | null | undefined,
): boolean {
	return canCreate(getEdition(), resource, currentCount, plan);
}

/**
 * Get a human-readable error message when a resource limit is reached.
 *
 * **Server-side only** -- calls getEdition() which reads process.env.
 * For browser use, call getResourceLimitMessage(edition, resource, plan) instead.
 */
export function getLimitReachedMessage(resource: keyof PlanLimits, plan: string | null | undefined): string {
	return getResourceLimitMessage(getEdition(), resource, plan);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatResourceName(resource: keyof PlanLimits): string {
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
