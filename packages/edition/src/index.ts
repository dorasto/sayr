// @repo/edition - Sayr Edition Detection & Capabilities
//
// Single source of truth for what edition of Sayr is running and what
// capabilities/limits are available. Used by both frontend and backend.

export type { Edition, PlanLimits, EditionCapabilities, CloudPlan, SelfHostedPlan, PlanId } from "./types";

export {
	getEdition,
	isCloud,
	isSelfHosted,
	isCommunity,
	isEnterprise,
	_resetEditionCache,
} from "./edition";

export {
	getEditionCapabilities,
	getEffectiveLimits,
	canCreateResource,
	getLimitReachedMessage,
} from "./capabilities";
