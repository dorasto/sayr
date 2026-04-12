import type { UserWithRole } from "better-auth/plugins";
import type { OrganizationSettings, TeamPermissions, OrgAiSettings, OrgAiRateLimit } from "@repo/database";

const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

/** Safely parse a Response body as JSON; returns null if parsing fails (e.g. HTML error pages). */
async function readJsonSafe(res: Response): Promise<unknown> {
	try {
		return await res.json();
	} catch {
		return null;
	}
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type ConsolePaginationMeta = {
	limit: number;
	page: number;
	totalPages: number;
	totalItems: number;
	hasMore: boolean;
};

export type ConsoleUser = {
	id: string;
	name: string;
	displayName?: string | null;
	email: string;
	emailVerified: boolean;
	image?: string | null;
	createdAt: string | Date;
	updatedAt: string | Date;
	role?: string | null;
	banned?: boolean | null;
	banReason?: string | null;
	banExpires?: string | Date | null;
	organizationCount: number;
	connections?: string[];
};

export type ConsoleUsersParams = {
	page?: number;
	limit?: number;
	search?: string;
	status?: "active" | "banned" | "pending" | "";
	role?: "admin" | "user" | "";
	sortBy?: string;
	sortDirection?: "asc" | "desc";
};

export type ConsoleUserOrganization = {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	joinedAt: string | Date | null;
	teams: {
		id: string;
		name: string;
		isAdmin: boolean;
		permissions: TeamPermissions;
	}[];
};

export type ConsoleUserSession = {
	id: string;
	createdAt: string | Date;
	updatedAt: string | Date;
	expiresAt: string | Date;
	ipAddress: string | null;
	userAgent: string | null;
	impersonatedBy: string | null;
};

export type ConsoleUserAccount = {
	id: string;
	providerId: string;
	createdAt: string | Date;
	updatedAt: string | Date;
	scope: string | null;
};

export type ConsoleActivityAggregate = {
	eventType: string;
	count: number;
};

export type ConsoleRecentActivity = {
	id: string;
	eventType: string;
	createdAt: string | Date | null;
	organization: { name: string; slug: string } | null;
	fromValue?: string | null;
	toValue?: string | null;
};

export type ConsoleUserDetail = {
	user: Omit<ConsoleUser, "organizationCount">;
	organizations: ConsoleUserOrganization[];
	sessions: ConsoleUserSession[];
	accounts: ConsoleUserAccount[];
	activity: {
		aggregates: ConsoleActivityAggregate[];
		recent: ConsoleRecentActivity[];
	};
};

// ──────────────────────────────────────────────
// Fetch functions
// ──────────────────────────────────────────────

/**
 * Fetches a paginated, filterable list of users for the admin console.
 */
export async function getConsoleUsers(
	params?: ConsoleUsersParams,
): Promise<{
	success: boolean;
	data: ConsoleUser[];
	pagination?: ConsolePaginationMeta;
	error?: string;
}> {
	const searchParams = new URLSearchParams();
	if (params?.page) searchParams.set("page", String(params.page));
	if (params?.limit) searchParams.set("limit", String(params.limit));
	if (params?.search) searchParams.set("search", params.search);
	if (params?.status) searchParams.set("status", params.status);
	if (params?.role) searchParams.set("role", params.role);
	if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
	if (params?.sortDirection) searchParams.set("sortDirection", params.sortDirection);

	const qs = searchParams.toString();
	const url = `${API_URL}/v1/console/users${qs ? `?${qs}` : ""}`;

	const res = await fetch(url, {
		method: "GET",
		credentials: "include",
	});

	const json = await res.json();
	if (!res.ok) {
		return { success: false, data: [], error: json?.error || "Failed to fetch users" };
	}
	return json;
}

/**
 * Fetches detailed information about a single user for the admin console.
 */
export async function getConsoleUser(
	userId: string,
): Promise<{ success: boolean; data?: ConsoleUserDetail; error?: string }> {
	const res = await fetch(`${API_URL}/v1/console/users/${userId}`, {
		method: "GET",
		credentials: "include",
	});

	const json = await res.json();
	if (!res.ok) {
		return { success: false, error: json?.error || "Failed to fetch user" };
	}
	return json;
}

/**
 * Set the role of a user.
 *
 * @param userId - The ID of the user whose role is to be set.
 * @param role - The new role to assign to the user.
 * @returns A promise resolving to the result of setting the user's role.
 */
export async function consoleSetUserRoleAction(
	userId: string,
	role: "admin" | "user",
): Promise<{ success: boolean; data: UserWithRole; error?: string }> {
	const payload = {
		userId: userId,
		role: role,
	};
	const result = await fetch(`${API_URL}/v1/console/set-role`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to set user role");
		}
		return json;
	});
	return result;
}

// ──────────────────────────────────────────────
// Organization Types
// ──────────────────────────────────────────────

export type ConsoleOrg = {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	plan: string | null;
	seatCount: number | null;
	isSystemOrg: boolean;
	shortId: string;
	createdAt: string | Date | null;
	updatedAt: string | Date | null;
	createdBy: string | null;
	memberCount: number;
};

export type ConsoleOrgsParams = {
	page?: number;
	limit?: number;
	search?: string;
	plan?: "free" | "pro" | "";
	sortBy?: string;
	sortDirection?: "asc" | "desc";
};

export type ConsoleOrgMember = {
	id: string;
	userId: string;
	joinedAt: string | Date | null;
	seatAssigned: boolean;
	user: {
		id: string;
		name: string;
		displayName?: string | null;
		email: string;
		image: string | null;
		role?: string | null;
		banned?: boolean | null;
	};
	teams: {
		id: string;
		name: string;
		isSystem: boolean;
		isAdmin: boolean;
		permissions: TeamPermissions;
	}[];
};

export type ConsoleOrgDetail = {
	org: {
		id: string;
		name: string;
		slug: string;
		logo: string | null;
		bannerImg: string | null;
		description: string;
		plan: string | null;
		seatCount: number | null;
		isSystemOrg: boolean;
		shortId: string;
		createdAt: string | Date;
		updatedAt: string | Date;
		createdBy: string | null;
		polarCustomerId: string | null;
		polarSubscriptionId: string | null;
		currentPeriodEnd: string | Date | null;
		settings: OrganizationSettings | null;
	};
	members: ConsoleOrgMember[];
};

// ──────────────────────────────────────────────
// Organization Fetch Functions
// ──────────────────────────────────────────────

/**
 * Fetches a paginated, filterable list of organizations for the admin console.
 */
export async function getConsoleOrgs(
	params?: ConsoleOrgsParams,
): Promise<{
	success: boolean;
	data: ConsoleOrg[];
	pagination?: ConsolePaginationMeta;
	error?: string;
}> {
	const searchParams = new URLSearchParams();
	if (params?.page) searchParams.set("page", String(params.page));
	if (params?.limit) searchParams.set("limit", String(params.limit));
	if (params?.search) searchParams.set("search", params.search);
	if (params?.plan) searchParams.set("plan", params.plan);
	if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
	if (params?.sortDirection) searchParams.set("sortDirection", params.sortDirection);

	const qs = searchParams.toString();
	const url = `${API_URL}/v1/console/organizations${qs ? `?${qs}` : ""}`;

	const res = await fetch(url, {
		method: "GET",
		credentials: "include",
	});

	const json = await readJsonSafe(res) as Record<string, unknown> | null;
	if (!res.ok) {
		return { success: false, data: [], error: (json as { error?: string } | null)?.error || "Failed to fetch organizations" };
	}
	return json as { success: boolean; data: ConsoleOrg[]; pagination?: ConsolePaginationMeta; error?: string };
}

/**
 * Fetches detailed information about a single organization for the admin console.
 */
export async function getConsoleOrg(
	orgId: string,
): Promise<{ success: boolean; data?: ConsoleOrgDetail; error?: string }> {
	const res = await fetch(`${API_URL}/v1/console/organizations/${orgId}`, {
		method: "GET",
		credentials: "include",
	});

	const json = await readJsonSafe(res) as Record<string, unknown> | null;
	if (!res.ok) {
		return { success: false, error: (json as { error?: string } | null)?.error || "Failed to fetch organization" };
	}
	return json as { success: boolean; data?: ConsoleOrgDetail; error?: string };
}

// ──────────────────────────────────────────────
// AI Usage Types (cloud-only)
// ──────────────────────────────────────────────

export type ConsoleAiUsageRow = {
	event_time: string;
	event_type: string;
	actor_id: string;
	actor_name: string | null;
	actor_image: string | null;
	target_id: string;
	task_short_id: number | null;
	task_title: string | null;
	task_url: string | null;
	model: string;
	input_tokens: number;
	output_tokens: number;
	total_tokens: number;
	cost_cents: number;
	success: number; // 0 or 1 from ClickHouse Bool
};

export type ConsoleAiMonthlySummary = {
	month: string; // 'YYYY-MM'
	requests: number;
	input_tokens: number;
	output_tokens: number;
	total_tokens: number;
	cost_cents: number;
};

// ──────────────────────────────────────────────
// AI Usage Fetch Function
// ──────────────────────────────────────────────

/**
 * Fetches AI usage data for a single organization from ClickHouse (cloud-only).
 */
export async function getConsoleOrgAiUsage(
	orgId: string,
	days: number,
): Promise<{
	success: boolean;
	data?: { rows: ConsoleAiUsageRow[]; monthlySummary: ConsoleAiMonthlySummary[] };
	error?: string;
}> {
	const res = await fetch(`${API_URL}/v1/console/organizations/${orgId}/ai-usage?days=${days}`, {
		method: "GET",
		credentials: "include",
	});

	const json = await readJsonSafe(res) as Record<string, unknown> | null;
	if (!res.ok) {
		return { success: false, error: (json as { error?: string } | null)?.error || "Failed to fetch AI usage" };
	}
	return json as { success: boolean; data?: { rows: ConsoleAiUsageRow[]; monthlySummary: ConsoleAiMonthlySummary[] }; error?: string };
}

// ──────────────────────────────────────────────
// AI Usage Summary — all orgs, last 30 days
// ──────────────────────────────────────────────

export type ConsoleOrgAiSummary = {
	org_id: string;
	requests: number;
	total_tokens: number;
	input_tokens: number;
	output_tokens: number;
	/** Sum of persisted cost_cents at event-emit time — accurate across all model variants. */
	total_cost_cents: number;
};

/**
 * Fetches 30-day AI usage aggregates for all orgs (cloud-only).
 * Returns an empty array when ClickHouse is unavailable.
 */
export async function getConsoleOrgsAiSummary(): Promise<ConsoleOrgAiSummary[]> {
	try {
		const res = await fetch(`${API_URL}/v1/console/organizations/ai-usage-summary`, {
			method: "GET",
			credentials: "include",
		});
		// Treat ClickHouse-unavailable cases (204, 404) as an empty result.
		// Propagate auth or server errors so callers are aware of the problem.
		if (res.status === 204 || res.status === 404) return [];
		if (!res.ok) throw new Error(`AI summary fetch failed: ${res.status}`);
		const json = await readJsonSafe(res) as { data?: ConsoleOrgAiSummary[] } | null;
		return json?.data ?? [];
	} catch {
		return [];
	}
}

// ──────────────────────────────────────────────
// MRR Summary Types
// ──────────────────────────────────────────────

export type ConsoleOrgMrrSummary = {
	org_id: string;
	mrr_cents: number; // normalised to monthly, in cents
	currency: string; // e.g. "usd" or "eur"
	status: string; // subscription status
	seats: number | null;
	recurring_interval: string; // "month" | "year"
};

// ──────────────────────────────────────────────
// MRR Summary Fetch
// ──────────────────────────────────────────────

/**
 * Fetches MRR per org from Polar (admin API).
 * Returns an empty array when Polar is unavailable or not configured.
 */
export async function getConsoleOrgsMrrSummary(): Promise<ConsoleOrgMrrSummary[]> {
	try {
		const res = await fetch(`${API_URL}/v1/console/organizations/mrr-summary`, {
			method: "GET",
			credentials: "include",
		});
		// Treat Polar-unavailable/not-configured cases (204, 404) as an empty result.
		// Propagate auth or server errors so callers are aware of the problem.
		if (res.status === 204 || res.status === 404) return [];
		if (!res.ok) throw new Error(`MRR summary fetch failed: ${res.status}`);
		const json = await readJsonSafe(res) as { data?: ConsoleOrgMrrSummary[] } | null;
		return json?.data ?? [];
	} catch {
		return [];
	}
}

// ──────────────────────────────────────────────
// AI Settings Types + Fetch
// ──────────────────────────────────────────────

export type { OrgAiSettings, OrgAiRateLimit };

/** Patch body for PATCH /console/organizations/:orgId/ai-settings */
export type OrgAiSettingsPatch = {
	/** When true, all AI features are hidden entirely for the org. */
	disabled?: boolean;
	/**
	 * Set to an object with `until` (ISO 8601) and optional `reason` to apply a
	 * rate limit. Set to null to remove an existing rate limit.
	 */
	rateLimited?: { until: string; reason?: string } | null;
	/** When false, the AI task summary panel is hidden for the org. */
	taskSummary?: boolean;
};

/**
 * Updates AI settings for an organization (admin console only).
 */
export async function updateConsoleOrgAiSettings(
	orgId: string,
	patch: OrgAiSettingsPatch,
): Promise<{ success: boolean; data?: { ai: OrgAiSettings }; error?: string }> {
	const res = await fetch(`${API_URL}/v1/console/organizations/${orgId}/ai-settings`, {
		method: "PATCH",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(patch),
	});

	const json = await readJsonSafe(res) as Record<string, unknown> | null;
	if (!res.ok) {
		return { success: false, error: (json as { error?: string } | null)?.error || "Failed to update AI settings" };
	}
	return json as { success: boolean; data?: { ai: OrgAiSettings }; error?: string };
}
