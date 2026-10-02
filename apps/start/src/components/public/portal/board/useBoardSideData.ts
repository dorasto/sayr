import type { schema } from "@repo/database";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { mergeReleaseLists } from "@/lib/portal/merge-releases";
import type { PortalDateInput } from "@/lib/portal/time";

const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";
const basePublicApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/public/v1" : "/api/public/v1";

export interface BoardCounts {
	/** Open public posts (backlog, todo, in-progress): the exact Active tab count. */
	open: number;
	categories: Array<{ id: string | null; count: number }>;
}

export const boardCountsKey = (organizationId: string) => ["board-counts", organizationId] as const;

/** `GET .../task/tasks/counts`: exact open total and per-category open totals for the Active tab and category card. */
export function useBoardCounts(organizationId: string) {
	return useQuery<BoardCounts>({
		queryKey: boardCountsKey(organizationId),
		queryFn: async () => {
			const res = await fetch(`${baseApiUrl}/v1/admin/organization/task/tasks/counts?org_id=${organizationId}`);
			if (!res.ok) throw new Error("Failed to fetch task counts");
			const json: { data: BoardCounts } = await res.json();
			return json.data;
		},
		staleTime: 1000 * 30,
		refetchOnWindowFocus: false,
	});
}

/** A release as the public releases endpoint serialises it (dates arrive as ISO strings). */
export interface PublicReleaseSummary {
	id: string;
	name: string;
	slug: string;
	status: schema.releaseType["status"];
	releasedAt?: PortalDateInput;
	targetDate?: PortalDateInput;
	createdAt?: PortalDateInput;
}

export const boardReleasesKey = (orgSlug: string) => ["board-releases", orgSlug] as const;

/** Releases to load per status: the endpoint caps `limit` at 50. */
const RELEASES_PER_STATUS = 50;

/**
 * The status=all listing is ordered by target date ascending, so past 50 releases it would drop the newest ones. Fetch
 * the 50 most recently released (ordered `releasedAt` desc) plus the upcoming planned and in-progress ones instead.
 */
async function fetchReleasesByStatus(orgSlug: string, status: "released" | "planned" | "in-progress") {
	const res = await fetch(
		`${basePublicApiUrl}/organization/${orgSlug}/releases?page=1&limit=${RELEASES_PER_STATUS}&status=${status}`
	);
	if (!res.ok) throw new Error("Failed to fetch releases");
	const json: { data: { releases: PublicReleaseSummary[] } } = await res.json();
	return json.data.releases;
}

/**
 * Recent released + upcoming releases (deduped by id): names for the row release tag, the Latest release card, the
 * roadmap's "Done recently" and the activity feed. The one place the portal fetches releases (single shared cache key).
 */
export function useBoardReleases(orgSlug: string) {
	const query = useQuery<PublicReleaseSummary[]>({
		queryKey: boardReleasesKey(orgSlug),
		queryFn: async () =>
			mergeReleaseLists(
				await Promise.all([
					fetchReleasesByStatus(orgSlug, "released"),
					fetchReleasesByStatus(orgSlug, "in-progress"),
					fetchReleasesByStatus(orgSlug, "planned"),
				])
			),
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	const releases = query.data;
	const releasesById = useMemo(() => new Map((releases ?? []).map((release) => [release.id, release])), [releases]);

	return {
		releases: releases ?? [],
		releasesById,
		isPending: query.isPending,
		isError: query.isError,
		refetch: query.refetch,
	};
}

/** Number of public posts attached to a release, from the release detail endpoint; `null` until known or on failure. */
export function useReleaseTaskCount(orgSlug: string, releaseSlug: string | null) {
	const query = useQuery<number>({
		queryKey: ["board-release-task-count", orgSlug, releaseSlug],
		queryFn: async () => {
			const res = await fetch(`${basePublicApiUrl}/organization/${orgSlug}/releases/${releaseSlug}`);
			if (!res.ok) throw new Error("Failed to fetch release");
			const json: { data: { tasks: unknown[] } } = await res.json();
			return json.data.tasks.length;
		},
		enabled: !!releaseSlug,
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false,
		retry: false,
	});

	return query.data ?? null;
}
