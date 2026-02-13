export type TaskSearchResult = {
	id: string;
	title: string | null;
	shortId: number | null;
	status: string;
	priority: string;
	organizationId: string;
	organizationName: string | null;
	organizationSlug: string | null;
};

const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

/**
 * Search tasks across all organizations the current user belongs to.
 *
 * @param query - Search query string (minimum 2 characters)
 * @param limit - Maximum number of results (default: 10, max: 25)
 * @returns Array of matching tasks with organization metadata
 */
export async function searchTasks(query: string, limit = 10): Promise<TaskSearchResult[]> {
	if (!query || query.trim().length < 2) return [];

	const params = new URLSearchParams({ q: query.trim(), limit: String(limit) });
	const res = await fetch(`${API_URL}/v1/admin/tasks/search?${params.toString()}`, {
		credentials: "include",
	});

	if (!res.ok) return [];

	const json = (await res.json()) as { success: boolean; data: TaskSearchResult[] };
	return json.success ? json.data : [];
}
