import type { schema } from "@repo/database";

const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

/**
 * Searches organization members for @mention autocomplete.
 *
 * @param orgId - The organization to search within.
 * @param query - Optional text to filter by name/displayName.
 * @param limit - Max results (default 20).
 * @returns Array of UserSummary objects.
 */
export async function searchMentionUsers(
	orgId: string,
	query?: string,
	limit?: number,
): Promise<schema.UserSummary[]> {
	const params = new URLSearchParams();
	if (query) params.set("query", query);
	if (limit) params.set("limit", String(limit));

	const qs = params.toString();
	const url = `${API_URL}/v1/admin/organization/${orgId}/members/search${qs ? `?${qs}` : ""}`;

	const res = await fetch(url, {
		credentials: "include",
	});

	if (!res.ok) {
		throw new Error(`Failed to search members: ${res.statusText}`);
	}

	const json = await res.json();
	return json.data ?? [];
}

/**
 * Resolves an array of user IDs to UserSummary objects.
 * Used by MentionView to render mention chips for any user by their stored ID.
 *
 * @param ids - Array of user IDs to resolve.
 * @returns Array of UserSummary objects for the found users.
 */
export async function resolveUsersByIds(ids: string[]): Promise<schema.UserSummary[]> {
	if (!ids.length) return [];

	const url = `${API_URL}/v1/admin/user/resolve`;

	const res = await fetch(url, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ ids }),
	});

	if (!res.ok) {
		throw new Error(`Failed to resolve users: ${res.statusText}`);
	}

	const json = await res.json();
	return json.data ?? [];
}
