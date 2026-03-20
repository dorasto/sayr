/**
 * Sayr Edition Types
 *
 * Defines the three deployment editions:
 * - `cloud`: The hosted Sayr Cloud service (sayr.io)
 * - `community`: Free self-hosted edition (CE)
 * - `enterprise`: Licensed self-hosted edition with expanded capabilities
 */

export type Edition = "cloud" | "community" | "enterprise";

/**
 * Resource limits for an organization.
 * `null` means unlimited for that resource.
 */
export interface PlanLimits {
	members: number | null;
	savedViews: number | null;
	issueTemplates: number | null;
	teams: number | null;
	releases: number | null;
}

/**
 * Edition-level capabilities that are independent of organization plan.
 * These are enforced at the instance level based on what edition is running.
 */
export interface EditionCapabilities {
	/** Maximum number of organizations a user can create. null = unlimited. */
	maxOrganizations: number | null;
	/** Whether Polar billing integration is available. */
	polarBillingEnabled: boolean;
	/** Whether Doras OAuth provider is available. */
	dorasOAuthEnabled: boolean;
	/** Whether telemetry is exported to Axiom (vs console). */
	axiomTelemetryEnabled: boolean;
	/** Whether the marketing site is included in the deployment. */
	marketingSiteEnabled: boolean;
	/** Whether multi-tenant public org resolution is enabled (vs system org only). */
	multiTenantEnabled: boolean;
	/** Whether ClickHouse analytics/audit logging is enabled. */
	clickhouseEnabled: boolean;
}

/**
 * Plan tiers available on the cloud edition.
 * Self-hosted editions use the "self-hosted" plan which has no restrictions.
 */
export type CloudPlan = "free" | "pro";
export type SelfHostedPlan = "self-hosted";
export type PlanId = CloudPlan | SelfHostedPlan;
