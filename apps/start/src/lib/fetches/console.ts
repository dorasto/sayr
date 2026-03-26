import type { UserWithRole } from "better-auth/plugins";
import type { TeamPermissions } from "@repo/database";

const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

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
