// @repo/edition - Sayr Edition Detection & Capabilities
//
// Single source of truth for what edition of Sayr is running and what
// capabilities/limits are available. Used by both frontend and backend.

export type {
	Edition,
	PlanLimits,
	EditionCapabilities,
	CloudPlan,
	SelfHostedPlan,
	PlanId,
} from "./types";

export {
	getEdition,
	isCloud,
	isSelfHosted,
	isCommunity,
	isEnterprise,
	isAiEnabled,
	_resetEditionCache,
} from "./edition";

export {
	// Server-side convenience wrappers (use getEdition() internally)
	getEditionCapabilities,
	getEffectiveLimits,
	canCreateResource,
	isAiAllowedForOrg,
	getLimitReachedMessage,
	// Pure functions (no process.env -- safe for browser use)
	getLimitsForEdition,
	canCreate,
	canOrgUseAi,
	isOverLimit,
	getResourceLimitMessage,
	formatResourceName,
	getMcpRateLimitPerMinute,
	// Types
	type NumericPlanResource,
	// Limit constants
	CLOUD_PLAN_LIMITS,
	SELF_HOSTED_LIMITS,
	FREE_LIMITS,
	MCP_RATE_LIMIT_PER_MINUTE,
} from "./capabilities";
