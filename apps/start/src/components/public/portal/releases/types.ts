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
