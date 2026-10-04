import type { ReleaseStatus } from "@/lib/portal/changelog";

/** A release as the public v1 list endpoint returns it (JSON, so dates are ISO strings). */
export interface PublicRelease {
	id: string;
	name: string;
	slug: string;
	status: ReleaseStatus;
	/** The raw rich-text JSON; the portal reads `descriptionMarkdown` instead. */
	description: unknown | null;
	descriptionMarkdown: string | null;
	leadId: string | null;
	color: string | null;
	icon: string | null;
	targetDate: string | null;
	releasedAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface PublicReleasesPage {
	releases: PublicRelease[];
	pagination: {
		page: number;
		limit: number;
		totalItems: number;
		totalPages: number;
		hasMore: boolean;
	};
}

/** Public API base: proxied in dev, same-origin `/api` in production. */
export const PUBLIC_API_URL =
	import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/public/v1" : "/api/public/v1";

export async function fetchPublicReleases(
	orgSlug: string,
	status: Exclude<ReleaseStatus, "archived">,
	page: number,
	limit: number
): Promise<PublicReleasesPage> {
	const params = new URLSearchParams({ page: String(page), limit: String(limit), status });
	const res = await fetch(`${PUBLIC_API_URL}/organization/${orgSlug}/releases?${params.toString()}`);
	if (!res.ok) throw new Error("Failed to fetch releases");
	const json = (await res.json()) as { data: PublicReleasesPage };
	return json.data;
}

/** The status and labels of a release's public posts (from the single-release endpoint), for its progress. */
export interface PublicReleaseTask {
	status: string;
	labels: ReadonlyArray<{ id: string; name: string; color: string | null }>;
}

export async function fetchPublicReleaseTasks(orgSlug: string, releaseSlug: string): Promise<PublicReleaseTask[]> {
	const res = await fetch(`${PUBLIC_API_URL}/organization/${orgSlug}/releases/${encodeURIComponent(releaseSlug)}`);
	if (!res.ok) throw new Error("Failed to fetch release");
	const json = (await res.json()) as { data: { tasks: PublicReleaseTask[] } };
	return json.data.tasks;
}

/** The fields of a public status update the changelog card reads (the endpoint returns them newest first). */
export interface PublicReleaseStatusUpdateSummary {
	health: string;
	createdAt: string;
	commentCount: number;
}

export async function fetchPublicReleaseStatusUpdates(
	orgSlug: string,
	releaseSlug: string
): Promise<PublicReleaseStatusUpdateSummary[]> {
	const res = await fetch(
		`${PUBLIC_API_URL}/organization/${orgSlug}/releases/${encodeURIComponent(releaseSlug)}/status-updates`
	);
	if (!res.ok) throw new Error("Failed to fetch status updates");
	const json = (await res.json()) as { data: { updates: PublicReleaseStatusUpdateSummary[] } };
	return json.data.updates;
}

/** How many public top-level comments a release's discussion has (one-item page, read from its `total`). */
export async function fetchPublicReleaseCommentTotal(orgSlug: string, releaseSlug: string): Promise<number> {
	const res = await fetch(
		`${PUBLIC_API_URL}/organization/${orgSlug}/releases/${encodeURIComponent(releaseSlug)}/comments?limit=1`
	);
	if (!res.ok) throw new Error("Failed to fetch release comments");
	const json = (await res.json()) as { data: { pagination: { total: number } } };
	return json.data.pagination.total;
}
