import type { ReleaseTaskCounts } from "@repo/database";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useContext } from "react";
import { getReleaseTaskCounts } from "@/lib/serverFunctions/getReleaseTaskCounts";

export type { ReleaseTaskCounts };

const releaseTaskCountsKey = (orgId: string) => ["release-task-counts", orgId] as const;

/**
 * The org's per-release task counts (done / in progress / planned), plus `refresh` to refetch them after a task or
 * release event. One grouped query for the whole board, not one per card.
 */
export function useReleaseTaskCountsQuery(orgId: string) {
	const queryClient = useQueryClient();
	const { data } = useQuery({
		queryKey: releaseTaskCountsKey(orgId),
		queryFn: () => getReleaseTaskCounts({ data: { orgId } }),
		staleTime: 30_000,
	});
	const refresh = useCallback(
		() => queryClient.invalidateQueries({ queryKey: releaseTaskCountsKey(orgId) }),
		[queryClient, orgId]
	);
	return { counts: data, refresh };
}

// undefined = counts still loading (cards then show no bar rather than a misleading empty one).
const ReleaseTaskCountsContext = createContext<Readonly<Record<string, ReleaseTaskCounts>> | undefined>(undefined);

export function ReleaseTaskCountsProvider({
	counts,
	children,
}: {
	counts: Readonly<Record<string, ReleaseTaskCounts>> | undefined;
	children: ReactNode;
}) {
	return <ReleaseTaskCountsContext.Provider value={counts}>{children}</ReleaseTaskCountsContext.Provider>;
}

const NO_TASKS: ReleaseTaskCounts = { done: 0, inProgress: 0, planned: 0 };

/** One release's counts; `null` while loading or outside a provider. A release with no tasks gets all zeros. */
export function useReleaseTaskCounts(releaseId: string): ReleaseTaskCounts | null {
	const counts = useContext(ReleaseTaskCountsContext);
	if (!counts) return null;
	return counts[releaseId] ?? NO_TASKS;
}
