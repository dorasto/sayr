// @repo/edition - Sayr Edition Detection & Capabilities
//
// Single source of truth for what edition of Sayr is running and what
// capabilities/limits are available. Used by both frontend and backend.

export {
	// Limit constants
	CLOUD_PLAN_LIMITS,
	canCreate,
	canCreateResource,
	canOrgUseAi,
	FREE_LIMITS,
	formatResourceName,
	// Server-side convenience wrappers (use getEdition() internally)
	getEditionCapabilities,
	getEffectiveLimits,
	getLimitReachedMessage,
	// Pure functions (no process.env -- safe for browser use)
	getLimitsForEdition,
	getMcpRateLimitPerMinute,
	getResourceLimitMessage,
	isAiAllowedForOrg,
	isOverLimit,
	MCP_RATE_LIMIT_PER_MINUTE,
	// Types
	type NumericPlanResource,
	SELF_HOSTED_LIMITS,
} from "./capabilities";

export {
	_resetEditionCache,
	getEdition,
	isAiEnabled,
	isCloud,
	isCommunity,
	isEnterprise,
	isSelfHosted,
} from "./edition";
export type {
	CloudPlan,
	Edition,
	EditionCapabilities,
	PlanId,
	PlanLimits,
	SelfHostedPlan,
} from "./types";
