import { useQuery } from "@tanstack/react-query";

const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

/** One entry of the viewer's votes for an organization (`GET .../task/voted`). Works for anonymous viewers too. */
export interface PublicVoteEntry {
	taskId: string;
	voteCount: number;
	count: number;
}

/** React Query key shared with every other reader of the viewer's votes (do not fork it). */
export const publicVotesKey = (organizationId: string) => ["votes", organizationId] as const;

export async function fetchPublicVotes(organizationId: string): Promise<PublicVoteEntry[]> {
	const res = await fetch(`${baseApiUrl}/v1/admin/organization/task/voted?orgId=${organizationId}`, {
		credentials: "include",
	});
	if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
	const data = await res.json();
	return data.data.tasks;
}

const EMPTY_VOTES: PublicVoteEntry[] = [];

/** The viewer's votes for an organization, under the shared `["votes", orgId]` key. */
export function usePublicVotes(organizationId: string) {
	const query = useQuery<PublicVoteEntry[]>({
		queryKey: publicVotesKey(organizationId),
		queryFn: () => fetchPublicVotes(organizationId),
		staleTime: 1000,
		gcTime: 2000 * 60,
		refetchOnWindowFocus: false,
	});

	return { votes: query.data ?? EMPTY_VOTES, isLoading: query.isLoading, refetch: query.refetch };
}
