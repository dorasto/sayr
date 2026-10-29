import type { ReleaseLatestUpdate, ReleaseTaskCounts } from "@repo/database";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useContext } from "react";
import { getReleaseBoardStats } from "@/lib/serverFunctions/getReleaseBoardStats";

export type { ReleaseLatestUpdate, ReleaseTaskCounts };

export interface ReleaseBoardStats {
	taskCounts: Readonly<Record<string, ReleaseTaskCounts>>;
	latestUpdates: Readonly<Record<string, ReleaseLatestUpdate>>;
}

const releaseBoardStatsKey = (orgId: string) => ["release-board-stats", orgId] as const;

/**
 * The org's per-release stats (task counts + latest status update), plus `refresh` to refetch them after a task,
 * release or status-update event. One grouped query for the whole board, not one per card.
 */
export function useReleaseBoardStatsQuery(orgId: string) {
	const queryClient = useQueryClient();
	const { data } = useQuery({
		queryKey: releaseBoardStatsKey(orgId),
		queryFn: () => getReleaseBoardStats({ data: { orgId } }),
		staleTime: 30_000,
	});
	const refresh = useCallback(
		() => queryClient.invalidateQueries({ queryKey: releaseBoardStatsKey(orgId) }),
		[queryClient, orgId]
	);
	return { stats: data, refresh };
}

// undefined = still loading (cards then show an empty bar rather than a misleading one).
const ReleaseBoardStatsContext = createContext<ReleaseBoardStats | undefined>(undefined);

export function ReleaseBoardStatsProvider({
	stats,
	children,
}: {
	stats: ReleaseBoardStats | undefined;
	children: ReactNode;
}) {
	return <ReleaseBoardStatsContext.Provider value={stats}>{children}</ReleaseBoardStatsContext.Provider>;
}

/** The whole stats object; undefined while loading or outside a provider. */
export function useReleaseBoardStats(): ReleaseBoardStats | undefined {
	return useContext(ReleaseBoardStatsContext);
}

const NO_TASKS: ReleaseTaskCounts = { done: 0, inProgress: 0, planned: 0 };

/** One release's counts; `null` while loading or outside a provider. A release with no tasks gets all zeros. */
export function useReleaseTaskCounts(releaseId: string): ReleaseTaskCounts | null {
	const stats = useContext(ReleaseBoardStatsContext);
	if (!stats) return null;
	return stats.taskCounts[releaseId] ?? NO_TASKS;
}
