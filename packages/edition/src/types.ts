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
	/** Whether AI features are available for this organization's plan. */
	aiEnabled: boolean;
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
	/**
	 * Whether embeddings-backed semantic search (task recommendations'
	 * nearest-neighbor matching, evidence-grounded label/category
	 * suggestions) is enabled. Cloud-only, same as the other
	 * infra-dependent capabilities above -- self-hosted instances still
	 * need the `task.embedding` column to physically exist (Drizzle's
	 * schema is shared across editions), which means Postgres must have
	 * the `pgvector` extension available for migrations to succeed, but
	 * the feature itself isn't enabled for self-hosted; recommendations
	 * fall back to the local word-overlap heuristic instead.
	 */
	semanticSearchEnabled: boolean;
}

/**
 * Plan tiers available on the cloud edition.
 * Self-hosted editions use the "self-hosted" plan which has no restrictions.
 */
export type CloudPlan = "free" | "pro";
export type SelfHostedPlan = "self-hosted";
export type PlanId = CloudPlan | SelfHostedPlan;
